# Development Notes

## Shareable JS modules

To use a JS file in both a browser/client and Node.js, the following recipe
 handles the requires/exports inconsistency.  The initial motivation for using
 our client side JS files in Node is for unit testing.  In the future, a more
 feature rich app based on Node or Electron would also need this facility.  See
 <https://code-maven.com/javascript-module-to-run-in-browser-and-in-node>

The protected and safe implementation can be referenced via Calc.add(), Calc.div(),
 etc:

```javascript
(function(){
    "use strict";
    this.Calc = function () {
        return Object.freeze({
            add: function(x, y) { return x + y; },
            div: function(x, y) { return x / y; },
            version: 0.01,
        });
    }();
}).call(this);
```

Similarly, the simplified implementation makes add() and div() available directly:

```javascript
(function(){
    this.add = function(x, y) { return x + y; },
    this.div = function(x, y) { return x / y; },
    this.ver = 0.01,
}).call(this);
```

### Unit testing JS

Would prefer to use QUnit as the syntax is similar to Python's unittest and Java's
 junit, but there isn't a decent Visual Code extenstion for it.  However, it's
 in-browser support is pretty substantial so it may be worth another look. Of the
 alternatives, Jasmine had the least external dependencies.

## Asset Revisioning

The default behaviour for gulp-revall may incorrectly replace text with revisioned
 names. See <https://github.com/smysnk/gulp-rev-all#annotater--replacer>.  In
 general this is seen when a quoted string happens to match the name of a
 javascript asset without the extension.  The intended use case appears to be
 with module loaders such as RequiresJS and CommonJS, neither of which we use.

Some specific occurrences found in our application:

- Reference to "load", "content", "data" in `jquery.min.js`
- Reference to "content" in `output.html`, unnecessary and probably harmless
- Reference to "protocol" in `protocol.js`
- Reference to "protocol" in `protocol1.html`, two wrongs make a right with above
- Reference to "scaling" in `scaling.html`, breaks restore defaults

As a remedy, we'll specify a replacer function that alters the behavior of the
 case where the reference is a JS file but the regex is only looking for the
 quoted filename without extension.  The change forces inclusion of the extension
 and will likely break the original use case mentioned above.  The regex in
 question is of the form `/('|")(filename)()('|"|$)/g`.

### Alternative Revision Naming

Consider using the transformFilename option to add the hash as a url parameter.
 For instance, `filename.ext?hash=12345678` instead of `filename.12345678.ext`.
 It reduces or eliminates the need for the manifest for firmware, and allows
 typing urls into the browser.

## Unify branch notes

Research into viability of consolidating all three (Mx50, Dx50, Mx60) of the web
 page source code folders into one.  Expecting to use gulp.js for automation.

### Workflow

(wip) Edit html and js files in the mockmeter repository.  Package with gulp and
 serve up with CherryPy for testing.  We will treat the 'web app' as a library
 for the firmware, so we will only need to transfer or import the `tfs_data.h`
 and `tfs_data.c` files.  Optionally, may want to also transfer `manifest.json`.

The gulp build process will use the following folder structure within mockmeter:  
`web_pages/dx50/bld`  
`web_pages/mx50/bld`  
`web_pages/mx60/bld`  

Within each `bld` folder, a destination.json file defines where to copy the
 processed static files and the tfs_data files.  The former are for use by mockmeter
 and latter for the firmware.  The `web_pages` folder holds files common to all
 builds, while the subfolders hold product specific files.

In the conf file, setting [device]/devmode True will change the mock server to
 use the unprocessed files.  This allows in place editing for convenience during
 web development.

> When does `rtcs.a` get transferred from mqx to our projects?

If it's transferred by the library build, then this isn't any different even if
 we automatically build all three variations at once.  Still, the problem with
 that is 2.5s becomes 7.5s and you're probably only interested in one at a time.

> Build all three at once or have option to specifiy via cli arg or config?

### Handling root index for firmware updates

- Change to serve root and index with header  `'Cache-control' = 'no-store'`.
  Done for mock and D650 firmware (`httpd_supp.c`).  Need for Mx50, Mx60.
- Added a version parameter to page redirects occuring on reboot.  (`cgi_web.c`)
  The effect is redundant to disabling caching above.
- Increased wait time on firmware reboot to 20 secs (`cgi_web.c`)
- Added an alias for `index1.html` to asset revisioned name. (`RTCS.C`)
- D650 logo banner is now clickable for root.  Add this to other products (`content.js`)

The combination of the above should quickly get the web client back on the correct
 set of files under any circumstances.  Typical scenario is a firmware update where
 the page redirect on reboot should suffice.  More challenging is a 'meter swap'
 at the same IP.  Clicking the banner, the web page home tab, or browser refresh
 will load the right files.  However, an upgrade from firmware without these changes
 to firmware with the changes will require the user to do a browser refresh.

### Comparisons

#### General

- needs mechanism to define and include disjoint sets of files
- consider making index.html not cacheable

#### Mx50 vs Mx60

- `auth.html`
  - Mx50 adds a radio button for a third lock option.  Need to migrate
 feature to the Mx60 and may need to check backend.
- `config.html`
  - Mx60 adds runtime check for Trend option to post message  
  - References model specific filename, e.g. mx50.cfg
  - Other minor text differences easily reconciled
- `content.js`
  - Mx60 (also Dx50) adds status tab.
- `cregs.js`
  - Mx60 adds Binary Outputs
  - Mx60 adds search filters
  - Mx60 adds some questionable calctype name handling
- `css_tabs.css`
  - ?
- `data.html`
  - different tables for measurement inclusion
  - Mx60 adds power supply monitoring
  - Mx60 adds vector, sync, and trend tabs
- `data.js`
  - changes to `check_status()` ?
  - Mx60 adds health flag decoding
  - Mx60 adds `check_connects()`
- `data2.html`
  - similar to `data.html`
- `dnpBilf.js`
  - changes?  health dbidx and counter calc types
- `dnpDatalog.js`
  - same changes as `dnpBilf.js`
  - Mx60 adds measurements of course
  - catalogs should be autogenerated and the challenge will be
    - handling the classification of different dnp types but need this for D650
    - change measurement key from index to enums, add compression?
- `identity.html`
  - trivial wording change
- `index.html`
  - different file load list, see #general above
- `index1.html`
  - needless insertion of a newline
- `input.html`
  - table changes for validation and inclusion.  schema?
  - changes to `parse_vars()`
  - Mx60 adds kyz and outputs.  This isn't really the right place.
  - Mx60 adds bus2 pts.  Could manually inject or use jQuery $().load()
- `load.js`
  - changes to `startUpload()`
  - unnecessary message change, revise.
- `mb*.js`
  - same issues as dnp
- `network.html`
  - trivial css change, needs fixing
- `output.html`
  - trivial text change
- `protocol.html`
  - whitespace only
- `protocol.js`
  - changes to `parse_vars()`
  - some likely only formatting changes
  - changes to serial port handling
- `protocol1.html`
  - alternate primary units scaling options
  - changes to confirm restore defaults
  - lots of trivial formatting changes
  - Mx60 adds filtering
- `recover.html`
  - trivial text changes
- `resets.html`
  - Mx60 adds peak fault resets
  - some text and formatting changes
- `scrnena.html`
  - white space only
- `serport.html`
  - MX60 adds multiple new options, gets complicated
  - may need to use work from Mx60/PPX merge
- `settings.html`
  - Mx60 adds new protocols, trend
  - more serial port issues
- `site.css`
  - trivial
- `tuc.js`
  - only measurement names, but Dx50 merge will remove
- `upload.html`
  - different max file size allowance
  - trivial text changes
