/*
Gulp environment setup

- assuming package.json, and package-lock.json pulled from product repo
- install node.js includes npm (v.10.16.2 and v6.9.0 at time of writing) 
- in product directory (where packages files are), execute `npm install`

- to run, enter `gulp` for help
- or 'gulp build' for normal release build

*/

const {src, dest, series, parallel, watch} = require('gulp');
const { execFile } = require('child_process');
const del = require('delete');
const rename = require("gulp-rename");
const terser = require('gulp-terser');
const htmlmin = require('gulp-htmlmin');
const size = require('gulp-size');
const gzip = require('gulp-gzip');
const gulpif = require('gulp-if');
const RevAll = require("gulp-rev-all");
const chalk = require('chalk'); // installed by gulp-size
const fs = require('fs');
const handlebars = require('gulp-compile-handlebars');
const filelist = require('gulp-filelist');
const merge = require('gulp-merge-json');
const path = require('path');
const glob = require('glob');

/*
Assume directory layout

# $(project_dir)
## .git
## .vscode
## ...
## node_modules
## resources
## web_pages <--(common static files, becomes `srcdir`)
### dx50 <-- (model static files, overrides)
#### scaling.html
#### ...
#### bld <-- (becomes `origindir`)
##### gulpfile.js <-- (launch file)
##### web_pages_cache
### mx50
#### bld
##### gulpfile.js
##### web_pages_cache
### mx60
#### bld
##### gulpfile.js
##### web_pages_cache
### index.html
### site.css
### ...
## gulpfile.js <-- (main build logic)
# end

*/
const origindir = (()=>{
    if (process.argv.includes('--gulpfile')) {
        // some environments pass the location of gulpfile.js when invoking
        dir = path.dirname(process.argv[process.argv.indexOf('--gulpfile')+1]);
    } else {
        // but when invoked from command line, we only need the cwd()
        dir = process.cwd();
    }
    console.log("origin=>"+dir);
    // return absolute path to the invoked gulpfile.js
    return dir
})();

// assume origindir is $(proj)/web_pages/mx50/bld
// path.dirname acts as a cheap 'cd ..'
// setting srcdir to $(proj)/web_pages
const srcdir= path.dirname(path.dirname(origindir));
const blddir= path.join(origindir,'web_pages_gulp');
const target_file=path.join(origindir,'tfs_data.c');
const rev_file=path.join(origindir,'rev.json');
const manifest_file=path.join(origindir,'manifest.json');

// assume origindir is $(proj)/web_pages/mx50/bld
// path.basename on a dir returns the leaf dir
// setting model to mx50 (with no delimiters)
const srcglobs = (() => {
    model = path.basename(path.dirname(origindir));
    glob_array = ['*', model+'/*'];
    excludes = glob.sync('*', {cwd: path.dirname(origindir), nodir: true });
    excludes.forEach((x, i, a) => a[i]='!'+x);
    glob_array = glob_array.concat(excludes)
    console.log("srcglobs =>", glob_array)
    return glob_array;
})(); // example ['*', 'dx50/*', '!scaling.html', '!scaling.js']

// setting base to srcdir allows 'rename' to see relative dir differences
const srcopts = {cwd: srcdir, base: srcdir, nodir: true};

function defaultTask(cb) {
    console.log('type "gulp --tasks" for command list')
    cb();
}

function clean(cb) {
    del(rev_file);
    del(manifest_file);
    del(target_file);
    del(blddir+'/*', cb);
}

function callMktfs(cb) {
    return execFile('/projects/mqx/tools/mktfs.exe',[blddir, target_file], cb)
}

function createManifest() {
    return src(srcglobs, srcopts)     // needs to match optioned_build()
        .pipe(rename( path=> {path.dirname= ''; /*console.log(path)*/ })) // TODO: make conditional
        .pipe(filelist("filelist.json", {flatten: false}))
        .pipe(src(rev_file, {allowEmpty: true}))
        .pipe(merge({fileName: manifest_file, edit: 
            // order matters, expecting array first then rev file
            (parsedJson, file) => {
                if (Array.isArray(parsedJson)) {
                    returnJson = {};
                    for (entry of parsedJson) returnJson[entry]=entry;
                    return returnJson
                }
                else return parsedJson;
            }
        }))
        .pipe(dest(origindir));
};

// Create a handlebars helper to look up
// fingerprinted asset by non-fingerprinted name
const handlebarOpts = {
    helpers: {
        assetPath: (path, context) => ['', context.data.root[path]].join('/'),
        // needsMapping: (key, val) => (key!=val),
        needsMapping: (key, context) => (key!=context.data.root[key]),
        macroFor: (id) => id.toUpperCase().replace(/\./g, "_"),
        status: () => "_compiled"
    }
};

function hbsManifest() {
    try {
        manifest = JSON.parse(fs.readFileSync(manifest_file, 'utf8'));
    } catch (error) {
        manifest = {};
    }
    return src('../*.hbs', {cwd: srcdir}) // TODO: consider relocating hbs files
    .pipe(size({title: 'templating', showFiles: verbose, showTotal: false}))
    .pipe(handlebars(manifest, handlebarOpts))
    .pipe(rename( (path) => path.extname='' ))
    .pipe(dest(origindir))
    ;
};

function buildit(doBust=true, doMini=true, doGzip=true, globHammerTime=['']) {

    // negate the globs that we can't touch
    globHammerTime.forEach((x, i, a) => a[i]='!'+x);
    verbose = process.argv.includes('--verbose');
    silent = process.argv.includes('--silent');

    function optioned_build() {
        // check out lazypipe and gulp-if and/or gulp-filter
        if (!doBust) console.log(chalk.black.bgYellowBright("Cache busting disabled"));
        if (!doMini) console.log(chalk.black.bgYellowBright("Minification  disabled"));
        if (!doGzip) console.log(chalk.black.bgYellowBright("Compression   disabled"));
        if (globHammerTime!='!') console.log(chalk.black.bgRedBright("Excluding",globHammerTime));

        // TODO: sourcemaps true causes WOFF2 integrity check to fail
        return src(srcglobs, Object.assign(srcopts, {sourcemaps: false}))
            .pipe(rename( path=> {path.dirname= ''; /* console.log(path) */ }))
            .pipe(size({title: chalk.inverse('initial size for'), showFiles: false}))

            // cache busting
            .pipe(gulpif(doBust, gulpif(['*', '!mb*.js', '!dnp*.js'].concat(globHammerTime), 
                RevAll.revision({
                    debug: false,
                    // includeFilesInManifest: ['*.*'], // oddly doesn't accept wildcards
                    fileNameManifest: rev_file,
                    includeFilesInManifest: ['.css', '.gif', '.html', '.ico', '.js', '.json', '.png', '.woff2'],
                    dontRenameFile:      ["index.html"],
                    dontUpdateReference: ["index.html"]
                }),
                size({title:'not busting', showFiles: verbose, showTotal: !verbose && !silent})
            )))

            // html minimize
            .pipe(gulpif(doMini, gulpif(['*.html'].concat(globHammerTime),
                htmlmin({
                    collapseWhitespace: true,
                    removeComments: true,
                    removeOptionalTags: true,
                    removeRedundantAttributes: true,
                    removeScriptTypeAttributes: true,
                    removeTagWhitespace: true,
                    useShortDoctype: true,
                    minifyCSS: true,
                    minifyJS: true,
                }),
                gulpif('*.html',size({title:'not minfing', showFiles: verbose, showTotal: !verbose && !silent})), 
            )))

            // js minimize
            .pipe(gulpif(doMini, gulpif(['*.js', '!*.min.js', '!dnp*.js', '!mb*.js'].concat(globHammerTime),
                terser(),
                gulpif('*.js',size({title:'not tersing', showFiles: verbose, showTotal: !verbose && !silent})), 
            )))

            // gzip
            //    can use the skipGrowingFiles option only if it doesn't break firmware
            //    assumptions about the presence or absence of 'gz' in the name
            .pipe(gulpif(doGzip, gulpif(['*', '!*.gif', '!*.png', '!*.woff', '!*.woff2'],
                gzip({skipGrowingFiles: false, gzipOptions: {level: 9} }),
                size({title:'not gziping', showFiles: verbose, showTotal: !verbose && !silent})
            )))

            // rename .ext.gz to .extgz
            .pipe(gulpif('*.gz',
                rename( path => {
                    path.basename += 'gz';
                    path.extname = '';
                })
            ))

            // write
            .pipe(size({title: chalk.inverse('payload for tfs')}))
            .pipe(dest(blddir, {sourcemaps: '../web_pages_map'}))
            .pipe(gulpif(doBust, RevAll.manifestFile()))
            .pipe(gulpif(doBust, dest(origindir)))
            ;
    }
    return optioned_build;
}

function build_release(){
    return series(clean, buildit(), createManifest, parallel(hbsManifest, callMktfs));
}

function build_debug(){
    return series(clean, buildit(false, false), createManifest, parallel(hbsManifest, callMktfs));
}

function build_custom(){
    if (process.argv.includes('--exclude')) {
        cli_exclude = process.argv[process.argv.indexOf('--exclude')+1]
            .replace(/[\'\"\[\]]/g,'').split(',') ; // remove []'"
    } else {
        cli_exclude = undefined;
    }
    return series(clean, buildit(true, true, true, cli_exclude), createManifest, parallel(hbsManifest, callMktfs));
}

function watch_web(cb) {
    watch(srcdir+'*', build_release())
}

exports.default = defaultTask;
exports.clean = clean;
exports.debug = build_debug();
exports.build = build_release();
exports.mktfs = build_release();
exports.watch = watch_web;
exports.custom = build_custom();

exports.build.description = 'production build';
exports.debug.description = 'debug build with only compression';
exports.mktfs.description = 'alias for build';
exports.custom.description = 'glob exclusion from cache busting and minification';
exports.custom.flags = {'--exclude': 'comma seperated globs to exclude '};
exports.default.flags = {
    '--verbose': 'enables some file listings in optioned_build()',
    '--silent': 'disables most messages in optioned_build()'
}
