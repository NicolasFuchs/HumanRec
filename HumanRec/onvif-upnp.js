const upnpClient = require('node-upnp-client');
let cli = new upnpClient();

/*cli.searchDevices();
cli.on('searchDevicesEnd', function() {
    console.log('****************************************************************************************************');
    console.log('                                             Servers\n                                              ');
    console.log(JSON.stringify(cli._servers));
    console.log('****************************************************************************************************');
    console.log('                                            Renderers\n                                             ');
    console.log(JSON.stringify(cli._renderers));
    console.log('****************************************************************************************************');
    console.log('                                          AvTransports\n                                            ');
    console.log(JSON.stringify(cli._avTransports));
    console.log('****************************************************************************************************');
    console.log('                                       ConnectionManagers\n                                         ');
    console.log(JSON.stringify(cli._connectionManagers));
    console.log('****************************************************************************************************');
*/

/*const onvif = require('onvif');
onvif.Discovery.probe({resolve: false}, function(err, cams) {
    console.log(cams);
    if (err) throw err;
    cams.forEach(function(cam) {
        console.log(cam.hostname);
        new onvif.Cam({hostname: cam.hostname, username: 'root', password: 'humanrec'}, function(err) {
            if (err) { throw err; }
            //console.log(JSON.stringify(this));
        });
    });
});*/

const onvif = require('node-onvif');
console.log('Start the discovery process.');
// Find the ONVIF network cameras.
onvif.startProbe().then((device_info_list) => {
    console.log(device_info_list.length + ' devices were found.');
    device_info_list.forEach((cam) => {
        let camera = new onvif.OnvifDevice({
            xaddr: cam.xaddrs[0],
            user: 'root',
            pass: 'humanrec'
        });
        camera.init().then(function() {
            let profile = camera.getCurrentProfile();
            console.log(JSON.stringify(profile, null, '  '));
            camera.services.media.getSnapshotUri({'ProfileToken': camera.getCurrentProfile().token}).then(function(result) {
                console.log(JSON.stringify(result['data'], null, '  '));
            });
        }).catch(function(err) {
            console.error(err);
        });
        //console.log('- ' + cam.urn);
        //console.log('  - ' + cam.name);
        //console.log('  - ' + cam.xaddrs[0]);
    });
}).catch((error) => {
    console.error(error);
});


//});