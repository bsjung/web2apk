const {getPageInfo, extend, download} = require('./functions');

const addAndroidPlatform = (callback) => {
    let fileExistSync = require('./fileExistSync');

    if (fileExistSync('./platforms/android')) {
        console.log('Using existent android platform');
        callback();
        return;
    }

    console.log('Adding android platform');
    const addPlatform = require('child_process').spawn('cordova', [
        'platform',
        'add',
        'android@8.1.0'
    ]);
    addPlatform.stdout.on('data', (data) => {
        console.log(String(data));
    });
    addPlatform.on('exit', function () {
        console.log('Platform added');
        callback();
    });
    addPlatform.stderr.on('data', (data) => {
        console.log(String(data));
    })
};

const cordova = (action, config) => {
    console.log('Building...');

    let params = [];
    params.push(action);
    params.push('android');
    if (action === 'run') {
        params.push('--device');
    }
    params.push('--release');
    params.push('--buildConfig=build.json');

    const cordovaCmd = require('child_process').spawn('cordova', params);

    cordovaCmd.stdout.on('data', (data) => {
        console.log(String(data));

        let matches = String(data).match(/[^\n\t]+android-release\.apk$/);
        if (matches && matches[0]) {
            let build = matches[0];

            if (action === 'build' && config.output) {
                let copy = require('recursive-copy');
                copy(build, config.output, {
                    overwrite: true
                }).on(copy.events.COPY_FILE_START, () => {
                    console.log(`Copying file to: ${config.output}`)
                }).on(copy.events.COPY_FILE_COMPLETE, () => {
                    console.log(`Build APK: ${config.output}`)
                }).on(copy.events.COPY_FILE_ERROR, (error) => {
                    console.log(`Error copying the file: ${error}`)
                });
            } else {
                console.log(`Build APK: ${build}`);
            }
        }

        if (String(data).search('BUILD SUCCESSFUL') >= 0) {
            console.log('[OK] Build success');
        }
        if (String(data).search('Using apk:') >= 0) {
            console.log('Launching...');
        }
        if (String(data).search('LAUNCH SUCCESS') >= 0) {
            console.log('[OK] Launch success');
        }
    });

    cordovaCmd.stderr.on('data', (data) => {
        console.log(String(data));
    })
};

const createTmp = (callback) => {
    let tmp = require('tmp');
    let copy = require('recursive-copy');

    console.log('Creating tmp files');

    tmp.dir({unsafeCleanup: false}, (err, path) => {
        if (err) throw err;

        copy(process.cwd(), path, () => {

            if (typeof callback === 'function') {
                callback(path);
            }
        });
    });
};

const prepareProject = (path, config, callback) => {
    if (path === process.cwd()) {
        throw 'The path prepare project should be different to current project path';
    }

    console.log(`Getting "${config.url}"`);
    getPageInfo(config.url).then(info => {
        let defaultConfig = {
            name: info.title,
            icon: info.app_icon,
            description: info.description,
        };
        let mergeConfig = extend(defaultConfig, config);
        console.log(`\t package: ${mergeConfig.package}`);
        console.log(`\t name: ${mergeConfig.name}`);
        console.log(`\t icon: ${mergeConfig.icon}`);
        console.log(`\t description: ${mergeConfig.description}`);
        console.log(`\t url: ${mergeConfig.url}`);

        if (mergeConfig.icon) {
            console.log(`Getting icon`);
            download(mergeConfig.icon, `${path}/icon.png`, () => {
                prepareFilesAndBuild(mergeConfig);
            })
        } else {
            prepareFilesAndBuild(mergeConfig);
        }
    });

    let prepareFilesAndBuild = function (config) {
        console.log(`Preparing files`);
        const replace = require('replace-in-file');
        const options = {
            files: [
                `${path}/config.xml`,
                `${path}/www/index.html`,
                `${path}/www/js/index.js`,
            ],
            from: [
                /\$APP_PACKAGE/g,
                /\$APP_VERSION/g,
                /\$APP_NAME/g,
                /\$APP_DESCRIPTION/g,
                /\$APP_URL/g
            ],
            to: [
                config.package,
                config.version,
                config.name,
                config.description,
                config.url
            ],
        };
        replace(options, (error, changes) => {
            if (error) {
                throw error;
            }

            if (typeof callback === 'function') {
                process.chdir(path);
                process.env.PWD = path;
                console.log(`Files ready!`);
                callback();
            }
        });
    }
};


module.exports = {createTmp, prepareProject, addAndroidPlatform, cordova};


