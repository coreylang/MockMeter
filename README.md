# **mockmeter**

![GitHub](https://img.shields.io/github/license/bitronics-llc/MockMeter.svg)
![GitHub last commit](https://img.shields.io/github/last-commit/bitronics-llc/MockMeter.svg)

> Simulate Mx50 embedded web server.

The simulated webserver is compatible Mx50, Dx50, Mx60 and PPX devices as their embedded
 implementations are largely similar.  For brevity, this document will refer to the
 devices collectively as Mx50.

Serve the production static files, HTML and JS, at normal URLs.  Respond to CGI requests
 with pre-made data.  If data for a particular request is not available and if the
 IP address of a live Mx50 has been supplied, then the request will be forwarded
 to the Mx50 and it's response captured to a file.  This feature allows collection
 of responses from differently optioned Mx50's.

This utility primarily addresses two use cases:

1. *UI development* - where the focus is on styling or Javascript functionality and
 backend behavior is unimportant.  The web server allows live reload of edited files
 without running the build process.
2. *Firmware deployment* - execute build process consisting of minification, compression,
 embedding, etc. for firmware.  The build process is implemented with Gulp tasks and
 various add-ons.

## Installation

### Setup development machine first time

* Install Python 3.x to use the web server.  Refer to pipfile for version requirement,
  but likely >= 3.7
  * (optional) Install [pipenv](https://pipenv.pypa.io/en/latest/index.html) to manage
    virtual environments and packages, otherwise use pip and venv.
* Install Node.js to use the Gulp build process.
  * (optional) Install Gulp globally with `npm install --global gulp-cli`, otherwise
    do for each project.

### Setup for each project

Recommend installation into a clean Python virtual environment.  Assuming Python,
 pip, and git are installed on the system, then pip's [VCS support](https://pip.pypa.io/en/latest/topics/vcs-support/)
 can be used.  This will insure that the required library dependencies are resolved.
 Use the following commands in a new directory.

> Note: in the following git URLs the branch 'development' is reference between `@` and `#`.
  Change as necessary, but this is the intended starting point.

To install the web server with pip and venv:

```shell
python -m venv venv
venv/scripts/activate
pip install -e git+https://github.com/bitronics-llc/MockMeter@development#egg=mockmeter --src .
```

Or, to install the web server with pipenv:

```shell
pipenv install -e git+https://github.com/bitronics-llc/MockMeter@development#egg=mockmeter --extra-pip-args="--src ."
pipenv shell
```

To install the build tools:

```shell
cd mockmeter
npm install
```

Using the '.' for the src parameter will resulting in the following disk layout.

```code
.
└── "NewProject"
    └── mockmeter
        ├── .git
        ├── mockmeter <--(python web server)
        ├── ...
        ├── web_pages <--(common static files, becomes `srcdir`)
        │   ├── mx50 <-- (model static files, overrides parent dir)
        │   │   ├── input.html
        │   │   ├── ...
        │   │   ├── bld <-- (becomes `origindir`)
        │   │   │   ├── destination.json
        │   │   │   └── gulpfile.js <-- (launch file)
        │   │   └── cgi <-- (simulated Mx50 responses)
        │   ├── dx50
        │   │   ├── input.html
        │   │   ├── ...
        │   │   ├── bld
        │   │   │   ├── destination.json
        │   │   │   └── gulpfile.js
        │   │   └── cgi
        │   ├── mx60
        │   │   ├── input.html
        │   │   ├── ...
        │   │   ├── bld
        │   │   │   ├── destination.json
        │   │   │   └── gulpfile.js
        │   │   └── cgi
        │   ├── index.html
        │   ├── site.css
        │   └── ...
        ├── package.json <-- (Node.js dependencies)
        ├── pipfile <-- (Python dependencies)
        ├── setup.py <-- (legacy setuptools script)
        ├── gulpfile.js <-- (main build logic)
        ├── m660.conf <-- (server configuration)
        ├── m650.conf <-- (server configuration)
        ├── d650.conf <-- (server configuration)
        └── ...
```

## Configuration

Configuration may be supplied with a `conf` file located in the `resources`
directory.

* `[device]/source` - provides location of static source files
* `[device]/model` - provides location of captured CGI responses
* `[device]/ipaddress` - provides address of live Mx50 (optional)
* `[device]/devmode` - if true serves static files in situ.
* additional [webserver](https://docs.cherrypy.dev/en/latest/config.html#configuration-files) configuration information

Example `app.conf` showing the default values used if omitted:

```ini
[global]
server.socket_port = 4249
engine.autoreload.on = True
[device]
source = 'Mx50'
model = 'M650M3P511'
ipaddress = None
```

The location of the `conf` file is used to resolve paths to the cgi and static resources.
 By convention, the static files must be at `[path_to_conf]/web_pages/[source]`,
 and the cgi files at `[path_to_conf]/web_pages/[source]/cgi`

In the conf file, setting `[device]/devmode` True will change the mock server to
 use the unprocessed files.  This allows in place editing for convenience during
 web development.  If False, then serve minified and compressed files as the firmware
 server would do.

For UI development, the typical configuration would include `[global]/engine.autoreload.on = True`
 and `[device]/devmode = True`.  Then, when the HTML/JS files are edited and saved
 the server will immediately reload them.

Depending on network environment and routing needs, `[global]/server.socket_host`
 may need to be changed from default, typically to `127.0.0.1` or `0.0.0.0`.

## Command line use

```shell
> mock -h
usage: mock [-h] [conf]

Launch mock web server using specified configuration file, 'conf'

positional arguments:
  conf        Name of configuration file

optional arguments:
  -h, --help  show this help message and exit
```

If no argument is provided then default is `app.conf`.  If a filename but no path
is provided, then the program will try first in the current working directory.  
If not found there, then it will look for the file in `%VIRTUAL_ENV%/../mockmeter/resources`.
If a path was provided with the filename, then it will only look there.

### Typical uses

#### Static web development

Assuming installation as above and the goal to modify the static web pages with
testing against an M650M3P511 model, then:

1. create a configuration file
    1. save at `NewProject/mockmeter/resources`
    2. name it `example.conf`
    3. enter contents:
        ```ini
        [global]
        server.socket_port = 4249
        engine.autoreload.on = True
        [device]
        source = 'Mx50'
        model = 'M650M3P511'
        ipaddress = None
        devmode = True
        ```
2. activate Python virtual environment
    1. skip if reusing shell from installation, otherwise
    2. in a new shell at `NewProject`, enter `venv\scripts\activate` or `pipenv shell`
3. launch webserver
    1. at shell prompt enter `mock example.conf`
4. modify static files
    1. edit shared files at `NewProject/mockmeter/web_pages`
    2. edit model files at `NewProject/mockmeter/web_pages/Mx50`
    3. these will be under git source control with a remote at github
    4. web server does not need to be restarted
5. test changes with browser
    1. point browser at `http://localhost:4249`
    2. test as necessary and ideally against other models as well

#### Dynamic development with new cgi

Documentation pending

#### Collection of cgi responses from additional models

Documentation pending

#### Build image for firmware

Documentation pending
