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

// assume dir layout is $(proj)/web_pages/mx50/bld
// gulp invoked in bld and main files are in web_pages
// path.dirname acts as a cheap 'cd ..'
const srcdir= path.dirname(path.dirname(origindir));
const blddir='./web_pages_gulp/';
const target_file='tfs_data.c';
const rev_file='rev.json';
const manifest_file='manifest.json';


function defaultTask(cb) {
    console.log('type "gulp --tasks" for command list')
    cb();
}

function clean(cb) {
    del(rev_file);
    del(manifest_file);
    del(target_file);
    del(blddir+'*', cb);
}

function callMktfs(cb) {
    return execFile('/projects/mqx/tools/mktfs.exe',[blddir, target_file], cb)
}

function createManifest() {
    return src('*', {cwd: srcdir, nodir: true})     // needs to match optioned_build()
        .pipe(filelist("filelist.json", {flatten: true}))
        .pipe(src(rev_file, {allowEmpty: true}))
        .pipe(merge({fileName: manifest_file, edit: 
            (parsedJson, file) => {
                if (Array.isArray(parsedJson)) {
                    returnJson = {};
                    for (entry of parsedJson) returnJson[entry]=entry;
                    return returnJson
                }
                else return parsedJson;
            }
        }))
        .pipe(dest('.'));
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
    .pipe(dest('.'))
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
        return src('*', {cwd: srcdir, nodir: true, sourcemaps: false})
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
            .pipe(gulpif(doBust, dest('.')))
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
