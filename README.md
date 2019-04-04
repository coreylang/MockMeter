# **mockmeter**

![GitHub](https://img.shields.io/github/license/bitronics-llc/MockMeter.svg)
![GitHub last commit](https://img.shields.io/github/last-commit/bitronics-llc/MockMeter.svg)

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

Configuration may be supplied with a `conf` file located in the `resources`
directory.

* `[device]/source` - provides location of static source files
* `[device]/model` - provides location of captured CGI responses
* `[device]/ipaddress` - provides address of live Mx50 (optional)
* additional [webserver](https://docs.cherrypy.org/en/latest/config.html#configuration-files) configuration information

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

The location of the `conf` file is used to resolve paths to the cgi and static
resources.  By convention, the static files must be at `[path_to_conf]/[source]/web_pages`,
and the cgi files at `[path_to_conf]/[source]/cgi/[model]`

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
        ```
2. activate Python virtual environment
    1. skip if reusing shell from installation, otherwise
    2. in a new shell at `NewProject`, enter `venv\scripts\activate`
3. launch webserver
    1. at shell prompt enter `mock example.conf`
4. modify static files
    1. edit files at `NewProject/mockmeter/resources/Mx50/web_pages`
    2. these will be under git source control with a remote at github
    3. webserver does not neet to be restarted
5. test changes with browser
    1. point browser at `http://localhost:4249`
    2. test as necessary and ideally against other models as well

#### Dynamic development with new cgi

Pending

#### Collection of cgi responses from additional models

Pending
