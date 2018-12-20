$(function () {

    let sidebarOpened = false;
    let $body = $('body');

    //Add persisted cameras at Application starting
    let addingNewCameras = false;
    $.get('http://localhost:3000/cameras/getCameras', function(cameras) {
        for (let i = 0; i < cameras.length; i++) {
            if (cameras[i].isWebcam === 'true') {
                $('#cameraNum').val(cameras[i].cameraNum);
            } else {
                $('#cameraIP').val(cameras[i].IPAddr);
            }
            $('#cameraNameModal').val(cameras[i].cameraName);
            $('#addModalButton').click();
            $('#cameraIP').val('');
        }
        addingNewCameras = true;
    });

    // Opens the menu to add or remove camera(s)
    $body.on('click', '#sidebarCollapse', function() {
        let $controlsContainer = $('#controlsContainer');
        let $sidebarCollapseIcon = $('#sidebarCollapseIcon');
        if (sidebarOpened) {
            sidebarOpened = false;
            $controlsContainer.css('margin-right', '-10%');
            $sidebarCollapseIcon.removeClass('fa-caret-square-o-right').addClass('fa-caret-square-o-left');
        } else {
            sidebarOpened = true;
            $controlsContainer.css('margin-right', '0');
            $sidebarCollapseIcon.removeClass('fa-caret-square-o-left').addClass('fa-caret-square-o-right');
        }
    });

    // Enables a camera name to be modified
    $body.on('click', '.fa-pencil-square', function() {
        const lastCameraName = $(this).siblings('input').val().replace(/\s/g, '_');
        $(this).removeClass('fa-pencil-square').addClass('fa-check-square ' + lastCameraName);
        $(this).siblings('input').removeAttr('readonly').focus();
    });

    // Updates a camera name
    $body.on('click', '.fa-check-square', function() {
        const cameraName = $(this).siblings('input').val();
        const CameraNameNoSpace = $(this).siblings('input').val().replace(/\s/g, '_');
        if (!checkIfNameExists(CameraNameNoSpace) || $(this).attr('class').split(' ').includes(CameraNameNoSpace)) {
            const classList = $(this).attr('class').split(' ');
            cameraNames[cameraNames.indexOf(classList[classList.length-1])] = CameraNameNoSpace;
            cameras.forEach(function(cam) {
                if (cam.name === classList[classList.length-1]) {
                    cam.name = CameraNameNoSpace;
                }
            });
            const oldCameraName = classList[classList.length-1];
            const newCameraName = $(this).siblings('input').val();

            $.ajax({url: 'http://localhost:3000/cameras/updateCamera', type: 'PUT', data: {
                oldCameraName: oldCameraName,
                newCameraName: newCameraName
            }}).done(function() {
                $.ajax({url: 'http://localhost:3000/history/updateHistoryCamera', type: 'PUT', data: {
                    oldCameraName: oldCameraName,
                    newCameraName: newCameraName
                }});
                localStorage.setItem('camerasSelectionUpdate', new Date().toLocaleString());
            });
            $(this).parent().parent().find('canvas').each(function() {
                if ($(this).attr('id').startsWith('canvas-video')) {
                    $(this).attr('id', 'canvas-video-' + cameraName);
                } else if ($(this).attr('id').startsWith('canvas-image')) {
                    $(this).attr('id', 'canvas-image-' + cameraName);
                }
            });
            $(this).removeClass('fa-check-square ' + classList[classList.length-1]).addClass('fa-pencil-square');
            $(this).siblings('input').attr('readonly', true);
        } else {
            let $invalidNameModal = $('#invalidNameModal');
            $invalidNameModal.modal('show');
            setTimeout(function() {
                $invalidNameModal.modal('hide');
                $(this).siblings('input').focus();
            }, 3000);
        }
    });

    // Blocks a static image
    $body.on('click', '.block', function() {
        $(this).siblings('.release').removeAttr('disabled');
        $(this).attr('disabled', true);
    });

    // Releases a static image
    $body.on('click', '.release', function() {
        $(this).siblings('.block').removeAttr('disabled');
        $(this).attr('disabled', true);
    });

    // Displays modal to add a camera
    $body.on('click', '#addCamera', function() {
        $('#addCameraModal').modal();
    });

    // Adds a camera to the system
    $body.on('click', '#addModalButton', function() {
        const cameraName = $('#cameraNameModal').val().replace(/\s/g, '_');
        if (!checkIfNameExists(cameraName)) {
            cameraNames.push(cameraName);
            if ($('#cameraIP').val() !== '') {
                cameras.push(new Cam(false, $('#cameraNameModal').val(), null));
                if (addingNewCameras) {
                    $.ajax({url: 'http://localhost:3000/cameras/addCamera', type: 'POST', data: {
                        isWebcam: false,
                        cameraName: $('#cameraNameModal').val(),
                        cameraNum: null,
                        IPAddr: $('#cameraIP').val()
                    }});
                }
                $('#camerasRow').append(cameraPattern.replace('src=""', 'src="' + $('#cameraIP').val() + '"').replace(/CameraX/g, $('#cameraNameModal').val()));
                $('#addCameraModal').modal('hide');
                const port = findNextAvailablePort();
                $.get('http://localhost:3000/cameras/createCameraSocket', {
                    cameraNum: $('#cameraIP').val(),
                    port: port,
                    rate: 3000
                });
                displayStaticVideo($('#cameraNameModal').val(), port);
            } else {
                let port = findNextAvailablePort();
                if (addingNewCameras) {
                    $.ajax({url: 'http://localhost:3000/cameras/addCamera', type: 'POST', data: {
                        isWebcam: true,
                        cameraName: $('#cameraNameModal').val(),
                        cameraNum: $('#cameraNum').val(),
                        IPAddr: null
                    }});
                }
                $.get('http://localhost:3000/cameras/createCameraSocket', {
                    cameraNum: $('#cameraNum').val(),
                    port: port,
                    rate: 500   //100
                });
                $('#camerasRow').append(cameraPattern.replace('<canvas id="canvas-video-CameraX"></canvas>', '<img id="canvas-video-CameraX">').replace(/CameraX/g, $('#cameraNameModal').val()));
                $('#addCameraModal').modal('hide');
                displayDirectVideo($('#cameraNameModal').val(), port);
                port = findNextAvailablePort();
                $.get('http://localhost:3000/cameras/createCameraSocket', {
                    cameraNum: $('#cameraNum').val(),
                    port: port,
                    rate: 3000
                });
                displayStaticVideo($('#cameraNameModal').val(), port);
            }
        } else {
            $('#invalidNameModal').modal('show');
            setTimeout(function() {
                $('#invalidNameModal').modal('hide');
            }, 3000);
        }
    });

    // Removes camera(s) from the system
    let camerasToRemove = [];
    $body.on('click', '#removeCamera', function() {
        if ($(this).attr('class').split(' ').includes('removalMode')) {
            $('#cameraDeletionMode').modal('hide');
            $('#camerasContainer').css('border', 'none');
            let NamesToRemoveForPersistance = [];
            $('#camerasRow').children().each(function() {
                const cameraToRemove = $(this);
                const cameraName = $(this).find('input').val();
                camerasToRemove.forEach(function(cam) {
                    NamesToRemoveForPersistance.push(cam.name);
                    if (cam.name === cameraName) {
                        if (cam.isWebcam) {
                            cam.socket.close();
                        }
                        cameraNames.splice(cameraNames.indexOf(cameraName), 1);
                        cameraToRemove.remove();
                    }
                });
            });
            $.ajax({url: 'http://localhost:3000/cameras/removeCameras', type: 'DELETE', data: {
                cameras: NamesToRemoveForPersistance
            }}).done(function() {
                localStorage.setItem('camerasSelectionUpdate', new Date().toLocaleString());
            });
            camerasToRemove = [];
            $(this).removeClass('removalMode');
            $('body').off('click', '.cameraCol');
        } else {
            $('#cameraDeletionMode').modal('show');
            setTimeout(function() {
                $('#cameraDeletionMode').modal('hide');
                $('#camerasContainer').css('border', '5px solid red');
            }, 5000);
            $(this).addClass('removalMode');
            $('body').on('click', '.cameraCol', function() {
                if ($(this).children('.cameraBlur').css('display') === 'none') {
                    $(this).children('.cameraBlur').css('display', 'flex');
                    let cameraCol = $(this);
                    cameras.forEach(function(cam) {
                        if (cam.name === cameraCol.find('input').val()) {
                            camerasToRemove.push(cam);
                        }
                    });
                } else {
                    $(this).children('.cameraBlur').css('display', 'none');
                    const selectedCamName = $(this).find('.nameRow > input').val();
                    camerasToRemove.forEach(function(cam, i) {
                        if (cam.name === selectedCamName) {
                            camerasToRemove.splice(i, 1);
                        }
                    });
                }
            });
        }
    });

});

//Checks if a name already exists (each camera name is unique)
let cameraNames = [];
function checkIfNameExists(cameraName) {
    return cameraNames.includes(cameraName);
}

// Each camera needs to communicate with the server using a socket and a unique port
let usedPorts = [];
function findNextAvailablePort() {
    if (usedPorts.length === 0) {
        usedPorts.push(1027);
    } else {
        usedPorts.push(usedPorts[usedPorts.length-1]+1);
    }
    return usedPorts[usedPorts.length-1];
}

// Socket connection, receipt and display of (dynamic) frames (only useful to webcams)
let cameras = [];
function displayDirectVideo(cameraName, port) {
    let socket = io.connect('http://127.0.0.1:' + port);
    cameras.push(new Cam(true, cameraName, socket));
    socket.on('frame', function (data) {
        const base64String = btoa(new Uint8Array(data.buffer).reduce(function(data, byte) {
            return data + String.fromCharCode(byte);
        }, ''));
        $('#canvas-video-' + cameraName).attr('src', 'data:image/png;base64,' + base64String);
    });
}

// Socket connection, receipt and display of (static) frames
function displayStaticVideo(cameraName, port) {
    let socket = io.connect('http://127.0.0.1:' + port);
    socket.on('frame', function (data) {
        const base64String = btoa(new Uint8Array(data.buffer).reduce(function(data, byte) {
            return data + String.fromCharCode(byte);
        }, ''));
        if (!$('#block-button-' + cameraName).is(':disabled')) {
            $('#canvas-image-' + cameraName).attr('src', 'data:image/png;base64,' + base64String);
        }
    });
}