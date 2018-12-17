from pathlib import Path
from urllib.parse import urlunsplit

import cherrypy
import requests
from slugify import slugify

""" Serve the meter's static files from a directory, and handle CGI requests via
exposed handlers.
"""


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

        `params`    a dict of request parameters
        `append_params` bool to optionally use parameters in resolving file name
        """

        fn = cherrypy.request.app.config['cgi']['path'] / slugify(
            cherrypy.request.method +
            cherrypy.request.path_info + 
            str(fn_append))
        ip = cherrypy.request.app.config['device']['ipaddress']
        if fn.exists():
            return fn.open(mode='rb')
        elif ip:
            print(self,'will serve from live meter for', fn)
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
        print("Received upload for {}".format([x for x in kwargs]))
        return self._fetch_cgi_resource({'files':kwargs.items()})

    @cherrypy.expose
    @cherrypy.tools.allow(methods=['GET', 'POST'])
    def default(self, attr, *args, **kwargs):
        """ Default behaviour for emulating CGI requests is to fetch a resource
        identified without including any parameters for it's name.  Specifically,
        most GETs need the 'ms' removed from the query string.  Most POST are
        submits and need the data from the body removed.
        """
        return self._fetch_cgi_resource({'data':kwargs})


if __name__ == '__main__':
    # TODO: should these be resolved differently?
    config_file = Path.cwd()/'resources/app.conf'
    resource_path = Path.cwd()/'resources/mx50'

    config_dict = {
        'global': {
            'engine.autoreload.on': True,
            'server.socket_host': '127.0.0.1',
            'server.socket_port': 4249
        },
        'device': {
            'ipaddress': None,
            'model': 'M650M3P511'
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
            'tools.staticfile.root': resource_path,
            'tools.staticfile.filename': 'stub.html'
        },
        '/favicon.ico': {
            'tools.staticfile.on': True,
            'tools.staticfile.root': resource_path,
            'tools.staticfile.filename': './web_pages/favicon.ico'
        }
    }

    cherrypy.config.update(config_dict)
    cherrypy.config.update(config_file.open())

    app = cherrypy.tree.mount(StaticsApp(), '', config_dict)
    app.merge(config_file.open())

    # validate resulting configuration
    if not app.config['device']['ipaddress']:
        print('No live meter specified.  Emulation only.')
    else:
        print('Using live meter at {} for missing cgi'.format(
            app.config['device']['ipaddress']))

    cgi_path = resource_path/'cgi'/app.config['device']['model']
    if cgi_path.exists():
        print('Serving CGI from {}'.format(cgi_path.as_posix()))
        app.merge({
            'cgi': {'path': cgi_path},
            '/stub.html': {'tools.staticfile.root': cgi_path}
            # TODO: meh, crude patch
            })
    else:
        raise NotADirectoryError

    cherrypy.engine.start()
    cherrypy.engine.block()
