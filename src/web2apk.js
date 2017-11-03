const {getPageInfo, extend, download} = require('./functions');

const addAndroidPlatform = (callback) => {
    const addPlatform = require('child_process').spawn('cordova', [
        'platform',
        'add',
        'android@6.3.0'
    ]);
    addPlatform.stdout.on('data', (data) => {
        console.log(String(data));
    });
    addPlatform.on('exit', function () {
        callback();
    });
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
                }).on(copy.events.COPY_FILE_COMPLETE, () => {
                    console.log(`Build APK: ${config.output}`)
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

    tmp.dir({unsafeCleanup: true}, (err, path) => {
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
            download(mergeConfig.icon, `${path}/icon.png`, () => {
                let fs = require('fs'), PNG = require('node-png').PNG;
                fs.createReadStream(`${path}/icon.png`)
                    .pipe(new PNG({}))
                    .on('parsed', function () {
                        this.pack().pipe(fs.createWriteStream(`${path}/icon.png`)).on('close', () => {
                            prepareFilesAndBuild(mergeConfig)
                        });
                    });
            })
        } else {
            prepareFilesAndBuild(mergeConfig);
        }
    });

    let prepareFilesAndBuild = function (config) {
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
                callback();
            }
        });
    }
};


module.exports = {createTmp, prepareProject, addAndroidPlatform, cordova};


