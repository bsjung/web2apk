const {getPageInfo, extend, download} = require('./functions');

const runOnDevice = () => {
    console.log('Building...');
    const cordova = require('child_process').spawn('cordova', [
        'run',
        'android',
        '--device',
        '--release',
        '--buildConfig=build.json',
    ]);

    cordova.stdout.on('data', (data) => {
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

    cordova.stderr.on('data', (data) => {
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
        console.log(mergeConfig);

        if (mergeConfig.icon) {
            download(mergeConfig.icon, `${path}/icon.png`, () => {
                prepareFilesAndBuild(mergeConfig);
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


module.exports = {createTmp, prepareProject, runOnDevice};


