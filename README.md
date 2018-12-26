# **mockmeter**

[![The MIT License](https://img.shields.io/badge/license-MIT-orange.svg?style=flat-square)](http://opensource.org/licenses/MIT)

> Simulate Mx50 embedded webserver.

Serve the production static files, HTML and JS, at normal URLs.  Respond to CGI
requests with premade data.  If data for a particular request is not available and
if the IP address of a live Mx50 has been supplied, then the request will be
forwarded to the Mx50 and it's response captured to a file.  This feature allows
collection of responses from differently optioned Mx50's.

## Installation

Recommend installation into a clean Python virtual environment.  Assuming Python,
pip, and git are installed on the system, then pip's [VCS support](https://pip.pypa.io/en/latest/reference/pip_install/#vcs-support) can be used.  This
will insure that the required library dependencies are resolved.  Use the following
commands in a new directory.

```shell
python -m venv venv
venv\scripts\activate
pip install -e git+https://github.com/bitronics-llc/MockMeter#egg=mockmeter --src .
```

Using the '.' for the src parameter will resulting in the following disk layout.

```code
+ NewProject
    + venv                      "python virtual environment
        + scripts
        ...
    + mockmeter
        + mockmeter             "python based webserver"
        + resources
            - app.conf          "server configuration"
            + mx50
                + cgi           "simulated Mx50 responses"
                + web_pages     "static files from Mx50 source"
            ...
```

## Configuration

Configuration may be supplied with an `app.conf` file.  Location TBD.

* `[device]/model` - provides location of captured CGI responses
* `[device]/ipaddress` - provides address of live Mx50 (optional)
* additional [webserver](https://docs.cherrypy.org/en/latest/config.html#configuration-files) configuration information

Example `app.conf` showing the default values used if omitted:

```ini
[global]
server.socket_port = 4249
engine.autoreload.on = True
[device]
model = 'M650M3P511'
ipaddress = '192.168.0.171'
```

## Examples

### Command line example

```shell
tbd
```

## Parameters

tbd