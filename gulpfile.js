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
## mockmeter <--(python web server)
## node_modules
## web_pages <--(common static files, becomes `srcdir`)
### dx50 <-- (model static files, overrides)
#### scaling.html
#### ...
#### bld <-- (becomes `origindir`)
##### destination.json
##### gulpfile.js <-- (launch file)
#### static
#### cgi
### mx50
#### bld
##### destination.json
##### gulpfile.js
#### static
#### cgi
### mx60
#### bld
##### destination.json
##### gulpfile.js
#### static
#### cgi
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
    } else if (process.argv.includes('-f')) {
        // some environments pass the location of gulpfile.js when invoking
        dir = path.dirname(process.argv[process.argv.indexOf('-f')+1]);
    } else {
        // but when invoked from command line, we only need the cwd()
        dir = process.cwd();
    }
    if (!path.isAbsolute(dir)) {
        // attempt to construct an absolute path
        dir = path.resolve(process.cwd(), dir);
    }
    console.log("origin=>",dir);
    // return absolute path to the invoked gulpfile.js
    return dir
})();

// assume origindir is $(proj)/web_pages/mx50/bld
// path.basename on a dir returns the leaf dir
// setting model to mx50 (with no delimiters)
const srcglobs = (() => {
    model = path.basename(path.dirname(origindir));
    glob_array = ['*', model+'/*'];
    excludes = glob.sync('*', {cwd: path.dirname(origindir), nodir: true });
    excludes.forEach((x, i, a) => a[i]='!'+x);
    glob_array = glob_array.concat(excludes)
    console.log("source=>", glob_array)
    return glob_array;
})(); // example ['*', 'dx50/*', '!scaling.html', '!scaling.js']

const destination = (()=>{
    // preload return varaible with defaults
    dests = {
        tfs_data: origindir,
        static: path.join(origindir,'web_pages_gulp') // TODO: make default '../static'?
    }
    // expect destination.json in origindir
    try {
        dests = Object.assign(dests,JSON.parse(fs.readFileSync(path.join(origindir,"destination.json"), 'utf8')));
        // resolve user paths from origindir if relative, no effect if absolute
        console.log("target=>",dests);
        for (x in dests) dests[x]=path.resolve(origindir, dests[x]);
        return dests;
    } catch (error) {
        console.log(chalk.bgRedBright("target=> ERROR: typically due to invoke location, check origin path"));
        console.log(error);
        process.exit();
    }
})();


// assume origindir is $(proj)/web_pages/mx50/bld
// path.dirname acts as a cheap 'cd ..'
// setting srcdir to $(proj)/web_pages
const srcdir= path.dirname(path.dirname(origindir));
const blddir= destination.static;
const tfsdir= destination.tfs_data;
const rev_file=path.join(origindir,'rev.json');
const manifest_file=path.join(origindir,'manifest.json');

// setting base to srcdir allows 'rename' to see relative dir differences
const srcopts = {cwd: srcdir, base: srcdir, nodir: true};
function remove_model_from_path(path) { 
    if (path.dirname==model) path.dirname= '.';
    //console.log(path);
}

function defaultTask(cb) {
    console.log('CTRL+C to exit, then "gulp --tasks" for additional commands')
    cb();
}

function clean(cb) {
    // force:true option required if outside of node's cwd
    del(rev_file);
    del(manifest_file);
    del(tfsdir+'/tfs_data.[ch]', {force: true});
    // console.log('delete -> ',blddir);
    process.chdir(srcdir);  // del doesn't seem to accept option={cwd:srcdir}
    del(blddir+'/*', cb);
}

function callMktfs(cb) {
    return execFile('/projects/mqx/tools/mktfs.exe',[blddir, path.join(tfsdir,'tfs_data.c')], cb)
}

function createManifest() {
    return src(srcglobs, srcopts)     // needs to match optioned_build()
        .pipe(rename( remove_model_from_path ))
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
    // apply manifest.json context to templates/*.hbs and 
    // save to either tfsdir/* or save as origindir/*
    try {
        manifest = JSON.parse(fs.readFileSync(manifest_file, 'utf8'));
    } catch (error) {
        manifest = {};
    }
    return src('templates/*.hbs', {cwd: srcdir})
    .pipe(size({title: 'templating', showFiles: verbose, showTotal: false}))
    .pipe(handlebars(manifest, handlebarOpts))
    .pipe(rename( (path) => path.extname='' ))
    .pipe(gulpif(['tfs_data.h'], dest(tfsdir), dest(origindir)))
    ;
};

function replacer (fragment, replaceRegExp, newReference, referencedFile){
    if (!referencedFile.path.match(/.js$/) || replaceRegExp.toString().includes('.js')) {
        fragment.contents = fragment.contents.replace(replaceRegExp, '$1' + newReference + '$3$4');
    } else {
        // console.log(chalk.redBright('Skip replacing ==> '+replaceRegExp));
    }
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
            .pipe(rename( remove_model_from_path))
            .pipe(size({title: chalk.inverse('initial size for'), showFiles: false}))

            // cache busting
            .pipe(gulpif(doBust, gulpif(['*', '!mb*.js', '!dnp*.js'],
                RevAll.revision({
                    debug: false,
                    // includeFilesInManifest: ['*.*'], // oddly doesn't accept wildcards
                    // TODO: see if handles regexp directly, e.g. something like [/*.*/g]
                    fileNameManifest: rev_file,
                    includeFilesInManifest: ['.css', '.gif', '.html', '.ico', '.js', '.json', '.png', '.woff2'],
                    dontRenameFile:      ["index.html"],
                    dontUpdateReference: ["index.html"],
                    dontSearchFile:      [".min.js"],  
                    replacer: replacer
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
    return series(clean, buildit(true, false, false), createManifest, parallel(hbsManifest, callMktfs));
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
    watch(srcglobs, {cwd:srcdir, depth:1, queue:true}, series(build_release(),
        cb => { console.log('=== Build complete for',srcglobs,'===' ); cb(); } 
    ))
}

exports.default = series(defaultTask, watch_web);
exports.build = build_release();
exports.debug = build_debug();
exports.custom = build_custom();
exports.clean = clean;

exports.build.description = 'production build';
exports.debug.description = 'debug build with only compression';
exports.custom.description = 'specify file exclusions from minification';
exports.custom.flags = {'--exclude': 'comma separated globs to exclude '};
exports.default.flags = {
    '--verbose': 'enables some file listings in optioned_build()',
    '--silent': 'disables most messages in optioned_build()'
}
