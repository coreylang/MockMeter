from pathlib import Path
from urllib.parse import urljoin, urlencode

import cherrypy
# from cherrypy._cpdispatch import Dispatcher
import requests

""" Crude attempt at capturing missed URLs using a Tool hook.  This might be workable,
but it seems like a lot of manual intervention for what might be more straightforward.

Better solution might exist with a custom Dispatch(), or
Cascading WSGI middleware apps.

Handling the need to serve static files from more than one local dir to /
by pipelining a second CherryPy app
"""

@cherrypy.tools.register('before_finalize', priority=90)
def logit():
    if cherrypy.response.status == 404:
        print('Whoa -->', cherrypy.response.status, cherrypy.request.path_info)
        # if 'network.cgi' in cherrypy.request.path_info:
        #     cherrypy.response.status = None
        #     cherrypy.response.body = bytes('\n'.join([
        #         "0",
        #         "hostname",
        #         "192.168.0.172",
        #         "192.168.0.1",
        #         "255.255.255.0",
        #         "0",
        #     ]),'utf-8')
        #     del cherrypy.response.headers['content-length']


def PipelineFactory(pipeline_app):

    class _PipelineFactoryClass(cherrypy.Application):
        def __init__(self, nextapp):
            self.nextapp = nextapp
            super().__init__(pipeline_app())

        def __call__(self, environ, start_response):
            # relies on nextapp.default() raising InternalRedirect
            print('Entered pipeline for {}'.format(pipeline_app.__name__))
            try:
                me = self.nextapp(environ, start_response)
                return me
            except:
                # try:
                me = super().__call__(environ, start_response)
                print(pipeline_app.__name__, 'attempting to handle', cherrypy.request.path_info)
                return me
                # except:
                #     print('darned if i know')
                #     return


    return _PipelineFactoryClass


# @cherrypy.tools.logit()
@cherrypy.tools.staticdir(dir='./cgi', root=Path.cwd()/'resources/mx50')
@cherrypy.tools.response_headers(headers=[('Content-Type','text/plain')])
# appears to serve from statics before methods, change priority?
class CGIApp(object):
    def __init__(self):
        self.base = 'http://10.161.129.197'
        self.cnt = 0

    @cherrypy.expose
    @cherrypy.tools.response_headers(on=False)
    def appid(self):
        return """<html>
          <body>
          Hello from CGI App
          </body>
        </html>"""
    
    @cherrypy.expose
    def example_cgi(self):
        return bytes('\n'.join([
            "0",
            "hostname",
            "192.168.0.172",
            "192.168.0.1",
            "255.255.255.0",
            "0",
        ]),'utf-8')

    @cherrypy.expose
    def ex2_cgi(self, ms):
        self.cnt += 1
        return "0\nMx50_amw\nMx50_desc\nMx50_owner\nct={}\n0".format(self.cnt)

    @cherrypy.expose
    def protocol_cgi(self, **kwargs):
        print('hi')


    @cherrypy.expose
    def default(self, attr, *args, **kwargs):
        # wont trap if url and method param signatures dont match
        # e.g. default(self, attr) wont trap input.cgi?ms=1
        # and  default(self, attr, ms) won't trap input.cgi
        # print(self,'raising internal redirect for',attr)
        # raise cherrypy.InternalRedirect('')
        print(self,'will serve from live meter for', attr)
        r = requests.get(urljoin(self.base,attr), params=kwargs)
        target = self._cp_config['tools.staticdir.root']/self._cp_config['tools.staticdir.dir']/attr

        try:
            r.raise_for_status()
        except requests.exceptions.HTTPError:
            raise cherrypy.HTTPError(r.status_code)
        else:
            # with open(target, 'w+b') as fp:
            #     fp.write(r.content)
            #     fp.flush()
            return r.content

# class LiveMeterApp(object):
#     base = 'http://10.161.129.197'
#     @cherrypy.expose
#     def meter(self):
#         return ('Forwarding app using ', self.base)

@cherrypy.tools.staticdir(dir='./web_pages', root=Path.cwd()/'resources/mx50', index='index.html')
class StaticsApp(object):
    def __init__(self):
    #     self.appid = self._appid()
    #     self.default = self._default()
        self.base = 'http://10.161.129.197'
        self.originatingmethod = None


    # @cherrypy.expose
    # class _appid(object):
    #     # @staticmethod
    #     def GET(self):
    #         return """<html><body>
    #         Hello from Statics App GET
    #         </body></html>"""
    #     # @staticmethod
    #     def PUT(self, **kwargs):
    #         return """<html><body>
    #         Hello from Statics App PUT {}
    #         </body></html>""".format(kwargs)

    @cherrypy.expose
    @cherrypy.tools.allow(methods=['GET','PUT'])
    def appid(self, **kwargs):
        # wont trap if url and method param signatures dont match
        # e.g. appid(self, attr) wont trap input.cgi?ms=1
        # and  appid(self, attr, ms) won't trap input.cgi
        return """<html><body>
        Hello from Statics App via {} with {}
        </body></html>""".format(cherrypy.request.method, kwargs)


    @cherrypy.expose
    def testerror(self):
        raise cherrypy.HTTPError(500)

    # @cherrypy.expose
    def network_cgi(self):
        raise cherrypy.InternalRedirect('/cgi/network.cgi')

    @cherrypy.expose
    @cherrypy.tools.allow(methods=['GET','POST'], debug=True)
    def default(self, attr, *args, **kwargs):
        print(self,'default() entered with', 
            cherrypy.request.method, attr, kwargs)

        if attr.startswith('cgi'):
            # we've already attempted a redirect into the CGI folder
            # get data from meter instead
            # raise cherrypy.HTTPError(404)
            print(self,'will serve from live meter for', args[0])
            r = requests.request(self.originatingmethod, 
                urljoin(self.base,args[0]), params=kwargs)
            target = (self._cp_config['tools.staticdir.root'] / 
                self._cp_config['tools.staticdir.dir'] / args[0])
            try:
                r.raise_for_status()
            except requests.exceptions.HTTPError:
                raise cherrypy.HTTPError(r.status_code)
            else:
                # with open(target, 'w+b') as fp:
                #     fp.write(r.content)
                #     fp.flush()
                return r.content

        else:
            # redirect to CGI folder
            print(self,'raising internal redirect for',attr)
            target_prm = urljoin('cgi/', attr)
            # InternalRedirect converts to GETs, so capture originating method
            self.originatingmethod = cherrypy.request.method
            raise cherrypy.InternalRedirect(target_prm, query_string=urlencode(kwargs))
            # raise cherrypy.HTTPRedirect(target_prm)


# class Capture404Dispatcher(Dispatcher):
#     def __call__(self, path_info):
#         x= super().__call__(path_info)
#         print(path_info,cherrypy.serving.request.handler)
#         # shows a 404 for any url not exposed in class
#         # but the url may get served from the statics later
#         return x


if __name__ == '__main__':
    conf = {
        '/': {
            # 'request.dispatch': cherrypy.dispatch.MethodDispatcher(),
            'tools.sessions.on': True
            # 'wsgi.pipeline': [
                # haven't yet been able to pipeline more than 2 apps
                # perhaps need to somehow de-assert InternalRedirect?
                # ('meter', PipelineFactory(LiveMeterApp)),
                # ('cascade', PipelineFactory(CGIApp)),
            # ]
        },
        '/cgi': {
            'tools.staticdir.on': True,
            'tools.staticdir.root': Path.cwd()/'resources/mx50',
            'tools.staticdir.dir': './cgi'
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
    cherrypy.tree.mount(StaticsApp(), '', conf)
    # cherrypy.tree.mount(CGIApp(), '/cgi')
    # cherrypy.tree.mount(LiveMeterApp(), '/live', conf)

    cherrypy.engine.start()
    cherrypy.engine.block()

"""
Response header differences on cgi, fix with
@cherrypy.tools.response_headers(headers=[('Content-Type','text/plain')])

Meter:
   Connection: Keep-Alive
   Content-Type: text/plain
   Transfer-Encoding: chunked

CherryPy:
   Accept-Ranges: bytes
   Content-Length: 64
   Content-Type: text/html
   Date: Wed, 28 Nov 2018 15:08:13 GMT
   Last-Modified: Wed, 28 Nov 2018 14:43:06 GMT
   Server: CherryPy/18.0.1

"""