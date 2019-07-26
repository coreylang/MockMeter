from pathlib import Path
from urllib.parse import urlunsplit
import json

import cherrypy
import requests
from slugify import slugify

""" Serve the meter's static files from a directory, and handle CGI requests via
exposed handlers.
"""

sample_flex = {
    "scalings": [
        {"nm": "flex scale", "dec":0,"sgn":True,"slp":1,"off":0,"min":0,"max":1 }
    ],
    "measurements": [
        {"nm": "flex measurement", "scl": "flex scale", "phs": "none", "nxa": "none"}
    ]
}

# Move to cherrypy.config if more than one server needed
states = {
    'pending_changes': False
}


@cherrypy.expose
class FlexApp(object):
    """ API for flex scalings """
    
    def _lazy_init(self):
        self.fn = cherrypy.request.app.config['path']['json']/"flexbackend.json"

    def _handle_incoming_json(self):
        # expects new json was loaded into self.scalings
        try:
            self.fn.exists()
        except AttributeError:
            self._lazy_init()
        with self.fn.open(mode='w') as fp:
            json.dump(self.scalings, fp, indent=None, separators=(',', ':'))
            fp.flush()
        states['pending_changes'] = True

    def restore_defaults(self):
        self.scalings = sample_flex

    @cherrypy.tools.json_out()
    def GET(self, *args, **kwargs):
        """ emulation for development """
        try:
            return self.scalings
        except AttributeError:
            # lazy init of scalings from storage
            self._lazy_init()
            if self.fn.exists():
                with self.fn.open(mode='r') as fp:
                    self.scalings = json.load(fp)
                cherrypy.log('Using scaling data at {}'.format(self.fn.as_posix()))
            else:
                self.scalings = sample_flex
                cherrypy.log('Using scaling data defaults')
            return self.scalings

    @cherrypy.tools.json_in()
    @cherrypy.tools.json_out()
    def PUT(self, *args, **kwargs):
        """ emulation for development """
        self.scalings = cherrypy.request.json
        self._handle_incoming_json()

        if cherrypy.request.app.config['device']['ipaddress']:
            ip = cherrypy.request.app.config['device']['ipaddress']
            url = urlunsplit(('http', ip, 'flexscale', '', ''))
            files = {'flex': ('flex',json.dumps(self.scalings))}
            try:
                r = requests.post(url, files=files)
                r.raise_for_status()
            except requests.exceptions.ChunkedEncodingError:
                print('mime errd')

        return {
            'message': 'Scalings have been updated',
            'pending': True
        }

    def POST(self, *args, **kwargs):
        """ emulation for developement """
        """ mimics the behavior of a POST to protcol1.html """
        cherrypy.log("Received upload for {}".format([x for x in kwargs]))
        self.scalings = json.loads(kwargs['flex'])
        self._handle_incoming_json()
        return """<script>window.top.window.stopUpload(1,"/flex_submit");void 0;</script>\r\n"""


class StaticsApp(object):
    """ Serve the meter's static files from a directory, and handle CGI requests via
    exposed handlers.

    `cgi_path`  location of captured CGI responses as a pathlib.Path object

    """
    def _fetch_cgi_resource(self, payload: dict, fn_append: str = ''):
        """ Return resource from disk if it exists, otherwise forward the request 
        to a physical meter.  Responses to forwarded requests are then captured
        as a local file for future use.  File names are resolved with the request
        path_info and optionally request parameters.

        `payload`    a dict of request parameters
        `fn_append` optionally use parameters in resolving file name
        """

        fn = cherrypy.request.app.config['path']['cgi'] / slugify(
            cherrypy.request.method +
            cherrypy.request.path_info + 
            str(fn_append))
        ip = cherrypy.request.app.config['device']['ipaddress']
        if fn.exists():
            return fn.open(mode='rb')
        elif ip:
            cherrypy.log('Will serve from live meter for {}'.format(fn))
            source = urlunsplit((cherrypy.request.scheme, ip,
                cherrypy.request.path_info, cherrypy.request.query_string,''))
            r = requests.request(cherrypy.request.method, source, **payload)
            try:
                r.raise_for_status()
            except requests.exceptions.HTTPError:
                raise cherrypy.HTTPError(r.status_code)
            else:
                with fn.open(mode='wb') as fp:
                    fp.write(r.content)
                    fp.flush()
                return r.content
            raise cherrypy.HTTPError(500)
        else:
            raise cherrypy.HTTPError(404)

    @cherrypy.expose
    def appid(self, **kwargs):
        # wont trap if url and method param signatures dont match
        # e.g. appid(self, attr) wont trap input.cgi?ms=1
        # and  appid(self, attr, ms) won't trap input.cgi
        # TODO: add more information, e.g. folders, version, etc.
        return """<html><body>
        Hello from Statics App via {} with {}
        </body></html>""".format(cherrypy.request.method, kwargs)

    @cherrypy.expose
    def testerror(self):
        raise cherrypy.HTTPError(500)

    @cherrypy.expose
    @cherrypy.tools.response_headers(headers=[('Content-Type','application/octet-stream')])
    @cherrypy.tools.allow(methods=['GET'])
    def m650_cfg(self, *args, **kwargs):
        """ Handle m650.cfg with a Content-Type header """
        return self._fetch_cgi_resource({'data':kwargs})

    @cherrypy.expose(['modbus.cgi', 'dnp.cgi'])
    @cherrypy.tools.response_headers(headers=[('Content-Type','text/plain')])
    @cherrypy.tools.allow(methods=['GET','POST'])
    def protocol_cgi(self, ms, *args, **kwargs):
        """ Handle protocol.cgi, modbus.cgi, dnp.cgi POSTs by including session """
        return self._fetch_cgi_resource({'data':kwargs}, kwargs)

    @cherrypy.expose(['config.html', 'upload.html'])
    @cherrypy.tools.allow(methods=['GET', 'POST'])
    def protocol1_html(self, *args, **kwargs):
        """ Handle protocol1.html file POSTs """
        # 'GET' is served by web_pages/protocol1.html
        # 'POST' is served here by using 'files' parameter
        cherrypy.log("Received upload for {}".format([x for x in kwargs]))
        return self._fetch_cgi_resource({'files':kwargs.items()})

    @cherrypy.expose
    @cherrypy.tools.allow(methods=['GET', 'POST'])
    def default(self, attr, *args, **kwargs):
        """ Default behaviour for emulating CGI requests is to fetch a resource
        identified without including any parameters for it's name.  Specifically,
        most GETs need the 'ms' removed from the query string.  Most POST are
        submits and need the data from the body removed.
        """
        # TODO: is this sufficiently accurate emulation?
        if cherrypy.request.method == 'POST':
            if 'Reset' in kwargs:
                states['pending_changes'] = False
            else:
                states['pending_changes'] = True
        return self._fetch_cgi_resource({'data':kwargs})

    # runtime emulated CGI reponses
    @cherrypy.expose
    @cherrypy.tools.allow(methods=['GET'])
    def pending_cgi(self, *args, **kwargs):
        static_cgi = self._fetch_cgi_resource({'data':kwargs})
        # static cgi won't be large so read the entire file in
        try:
            cgi = static_cgi.read()
            static_cgi.close()
        except AttributeError:
            # was a device response, return unmolested
            return static_cgi
        else:
            cgi = cgi.splitlines()
            cgi[0] = b'1' if states['pending_changes'] else b'0'
            cgi = b'\n'.join(cgi)
            return(cgi)

    @cherrypy.expose
    @cherrypy.tools.allow(methods=['POST'])
    def restore_cgi(self, *args, dflt, **kwargs):
        # only providing emulation for flex feature
        if dflt.lower() == 'scaling':
            cherrypy.tree.apps['/flexscale'].root.restore_defaults()
            return b"""<script>setTimeout(function() {window.location="scaling.html"; }, 0);</script>"""
        else:
            return self._fetch_cgi_resource({'data':kwargs})


def main(config_file: Path):

    # load global defaults
    cherrypy.config.update({
        'global': {
            'engine.autoreload.on': True,
            'server.socket_host': '127.0.0.1',
            'server.socket_port': 4249
            }
    })
    # load global overrides from user file
    cherrypy.config.update(config_file.open())

    # load device defaults
    app = cherrypy.tree.mount(StaticsApp(), '', {
        'device': {
            'source': 'mx50',
            'ipaddress': None,
            'model': 'M650M3P511'
        }
    })
    # load device overrides from user file
    app.merge(config_file.open())

    # check user settings and create application configuration
    if not app.config['device']['ipaddress']:
        cherrypy.log('No live meter specified.  Emulation only.')
    else:
        cherrypy.log('Using live meter at {} for missing cgi'.format(
            app.config['device']['ipaddress']))

    resource_path = config_file.absolute().parent/app.config['device']['source']
    if resource_path.exists():
        cherrypy.log('Serving WEB from {}'.format(resource_path.as_posix()))
    else:
        raise NotADirectoryError

    cgi_path = resource_path/'cgi'/app.config['device']['model']
    if cgi_path.exists():
        cherrypy.log('Serving CGI from {}'.format(cgi_path.as_posix()))
    else:
        raise NotADirectoryError(cgi_path.as_posix()+
            "\nIf attempting to capture new cgi data, directory must already exist")

    config_dict = {
        'path': {
            'cgi': cgi_path,
            'json': resource_path/'json'
        },
        '/': {
            'tools.sessions.on': True,
            'tools.response_headers.on': True,
            'tools.response_headers.headers': [('Server','Bitronics')],
            'tools.staticdir.on': True,
            'tools.staticdir.root': resource_path,
            'tools.staticdir.dir': './web_pages',
            'tools.staticdir.index': 'index.html'
        },
        '/stub.html': {
            'tools.staticfile.on': True,
            'tools.staticfile.root': cgi_path,
            'tools.staticfile.filename': 'stub.html'
        },
        '/favicon.ico': {
            'tools.staticfile.on': True,
            'tools.staticfile.root': resource_path,
            'tools.staticfile.filename': './web_pages/favicon.ico'
        }
    }
    # load application configuration
    app.merge(config_dict)

    cherrypy.tree.mount(FlexApp(), '/flexscale', {
        '/': {'request.dispatch': cherrypy.dispatch.MethodDispatcher()},
        'path': {'json': app.config['path']['json']},
        'device': {'ipaddress': app.config['device']['ipaddress']}
        }
    )

    cherrypy.engine.signals.subscribe()
    cherrypy.engine.start()
    cherrypy.engine.block()

def cli():
    """ Command line interface """
    import os
    import argparse

    parser = argparse.ArgumentParser(description="Launch mock web server using \
        specified configuration file, 'conf'")
    parser.add_argument('conf', help='Name of configuration file', 
        nargs='?', default='app.conf')
    args = parser.parse_args()

    conf = Path(args.conf)
    if not conf.exists():
        if len(conf.parts) > 1:
            # user provided path in addition to file, so don't search
            raise FileNotFoundError(conf)
        else:
            # search for file relative to virtual environment
            try:
                env = Path(os.environ['VIRTUAL_ENV']).parent
                conf = env/'mockmeter/resources'/conf.name
            except KeyError:
                # no virtual env defined, out of search locations
                pass
            if not conf.exists():
                raise FileNotFoundError(conf)

    main(config_file=conf)

if __name__ == '__main__':
    cli()
    # main(config_file = Path.cwd()/'mockmeter/resources/app.conf')
