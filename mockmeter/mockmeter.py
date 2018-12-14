from pathlib import Path
from urllib.parse import urlunsplit

import cherrypy
import requests
from slugify import slugify

""" Serve the meter's static files from a directory, and handle CGI requests via
exposed handlers.
"""


@cherrypy.tools.staticdir(dir='./web_pages', root=Path.cwd()/'resources/mx50', index='index.html')
class StaticsApp(object):
    """ Serve the meter's static files from a directory, and handle CGI requests via
    exposed handlers.

    `cgi_path`  location of captured CGI responses as a pathlib.Path object

    """
    def __init__(self, cgi_path: Path):
        self.ip = '10.161.129.197'
        self.cgi_path = cgi_path

    def _fetch_cgi_resource(self, params: dict, append_params: bool = True):
        """ Return resource from disk if it exists, otherwise forward the request 
        to a physical meter.  Responses to forwarded requests are then captured
        as a local file for future use.  File names are resolved with the request
        path_info and optionally request parameters.

        `params`    a dict of request parameters
        `append_params` bool to optionally use parameters in resolving file name
        """
        def _request_is_post_file():
            try:
                return 'boundary' in cherrypy.request.headers['Content-Type']
            except KeyError:
                return False

        params_for_fn = params if append_params else ''
        fn = self.cgi_path/slugify(cherrypy.request.path_info+str(params_for_fn))
        if fn.exists():
            return fn.open(mode='rb')
        else:
            print(self,'will serve from live meter for', fn)
            source = urlunsplit((cherrypy.request.scheme, self.ip,
                cherrypy.request.path_info, cherrypy.request.query_string,''))
            # TODO: can/should this be done at caller?
            if _request_is_post_file():
                payload = {'files': params.items()}
            else:
                payload = {'data': params}
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
        return self._fetch_cgi_resource(kwargs)

    @cherrypy.expose(['modbus.cgi', 'dnp.cgi'])
    @cherrypy.tools.response_headers(headers=[('Content-Type','text/plain')])
    @cherrypy.tools.allow(methods=['GET','POST'])
    def protocol_cgi(self, ms, *args, **kwargs):
        """ Handle protocol.cgi, modbus.cgi, dnp.cgi POSTs by including session """
        return self._fetch_cgi_resource(kwargs)

    @cherrypy.expose
    @cherrypy.tools.allow(methods=['GET', 'POST'])
    def protocol1_html(self, *args, **kwargs):
        """ Handle protocol1.html POSTs - could possibly be moved to default()"""
        # 'GET' is served by web_pages/protocol1.html
        # 'POST' is served here
        print("Received upload for {}".format([x for x in kwargs]))
        return self._fetch_cgi_resource(kwargs, append_params=False)

    @cherrypy.expose
    @cherrypy.tools.allow(methods=['GET', 'POST'])
    def default(self, attr, *args, **kwargs):
        """ Default behaviour for emulating CGI requests is to fetch a resource
        identified without including any parameters for it's name.  Specifically,
        most GETs need the 'ms' removed from the query string.  Most POST are
        submits and need the data from the body removed.
        """
        return self._fetch_cgi_resource(kwargs, append_params=False)


if __name__ == '__main__':
    cgi_path = Path.cwd()/'resources/mx50/cgi'

    conf = {
        '/': {
            'tools.sessions.on': True,
            'tools.response_headers.on': True,
            'tools.response_headers.headers': [('Server','Bitronics')]
        },
        '/stub.html': {
            'tools.staticfile.on': True,
            'tools.staticfile.root': cgi_path,
            'tools.staticfile.filename': 'stub.html'
        },
        '/favicon.ico': {
            'tools.staticfile.on': True,
            'tools.staticfile.root': Path.cwd()/'resources/mx50',
            'tools.staticfile.filename': './web_pages/favicon.ico'
        }
    }
    cherrypy.config.update({
        'engine.autoreload.on': False,
        'server.socket_host': '127.0.0.1',
        'server.socket_port': 4249
    })
    cherrypy.tree.mount(StaticsApp(cgi_path), '', conf)
    cherrypy.engine.start()
    cherrypy.engine.block()
