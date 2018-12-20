let historySocket = null;
let selectedCameras = [];

$(function() {

    // Binding between history and individuals (tracking options update) + cameras update
    $(window).bind('storage', function(e) {
        if (e.originalEvent.key === 'camerasSelectionUpdate') {                     // Update of the cameras filter
            $.get('http://localhost:3000/history/getFilters', function (filters) {
                selectedCameras = filters.cameras;
                $('#cameraSelectionButton').text(selectedCameras.length + ' camera(s) selected');
                updateHistoricalRows(filters.identifier);
            });
        } else {                                                                    // Tracking option added or image updated
            if (e.originalEvent.newValue !== null) {
                if (e.originalEvent.newValue.startsWith('merge_') && Array.isArray(JSON.parse(e.originalEvent.newValue.substring(6)))) {   // Tracking merge
                    const identifiersToMerge = JSON.parse(e.originalEvent.newValue.substring(6));
                    if ($('#trackedIndividualDisplayed h4').html() === e.originalEvent.key) {
                        updateHistoricalRows(e.originalEvent.key);
                    } else if (identifiersToMerge.includes($('#trackedIndividualDisplayed h4').html())) {
                        let isFound = false;
                        $('#trackedIndividualOptions h4').each(function() {
                            if ($(this).html() === e.originalEvent.key) {
                                $(this).parent().parent().click();
                                isFound = true;
                                return false;
                            }
                        });
                        if (!isFound) {
                            $('#trackedIndividualOptions').append(
                                '<div class="row" style="width: 100%; height: calc(10%*2/90*100); margin: 0;"> \
                                <div class="col-3" style="height: 100%; background-size: contain; background-repeat: no-repeat;"></div> \
                                <div class="col-9" style="height: 100%; color: black; display: flex; align-items: center;"><h4>' + e.originalEvent.key + '</h4></div> \
                                </div>'
                            );
                            $.ajax({url: 'http://localhost:3000/history/updateFilters', type: 'PUT', data: {
                                addTrackingIdentifier: e.originalEvent.key
                            }});
                        }
                        if (identifiersToMerge.includes($('#trackedIndividualDisplayed h4').html())) {
                            console.log($('#trackedIndividualOptions .row').last().get(0).outerHTML);
                            $('#trackedIndividualOptions .row').last().click();
                        }
                    }
                } else {
                    let isOptionExisting = false;
                    if ($('#trackedIndividualDisplayed h4').html() === e.originalEvent.key) {
                        if (e.originalEvent.newValue.startsWith('newIdentifier_')) {
                            $('#trackedIndividualDisplayed h4').html(e.originalEvent.newValue.substring(14));
                        } else {
                            $('#trackedIndividualDisplayed h4').parent().parent().find('.col-3').css('background-image', e.originalEvent.newValue);
                        }
                    }
                    $('#trackedIndividualOptions h4').each(function () {
                        if ($(this).html() === e.originalEvent.key) {
                            if (e.originalEvent.newValue.startsWith('newIdentifier_')) {
                                $(this).html(e.originalEvent.newValue.substring(14));
                            } else {
                                $(this).parent().parent().find('.col-3').css('background-image', e.originalEvent.newValue);
                            }
                            isOptionExisting = true;
                            return false;
                        }
                    });
                    if (!isOptionExisting) {
                        $('#trackedIndividualOptions').append(
                            '<div class="row" style="width: 100%; height: calc(10%*2/90*100); margin: 0;"> \
                            <div class="col-3" style="height: 100%; background-image: ' + e.originalEvent.newValue + '; background-size: contain; background-repeat: no-repeat;"></div> \
                            <div class="col-9" style="height: 100%; color: black; display: flex; align-items: center;"><h4>' + e.originalEvent.key + '</h4></div> \
                            </div>'
                        );
                    }

                }
            } else {                                        // Tracking option removed
                if ($('#trackedIndividualDisplayed h4').html() === e.originalEvent.key) {
                    $('#trackedIndividualDisplayed h4').parent().parent().empty();
                    $('#trackedIndividualOptions .row').first().click();
                }
                $('#trackedIndividualOptions h4').each(function() {
                    if ($(this).html() === e.originalEvent.key) {
                        $(this).parent().parent().remove();
                        return false;
                    }
                });
            }
        }
    });

    // Creates the server socket to receive historical data
    $.ajax({url: 'http://localhost:3000/cameras/createHistorySocket', type: 'POST'});

    // Displays the tracking individuals options
    $.get('http://localhost:3000/history/getTracking', function(trackingOptions) {
        let trackedIndividuals =    '<div class="row" style="width: 100%; height: calc(10%*2/90*100); margin: 0;"> \
                                    <div class="col-3" style="height: 100%;"><i class="fa fa-ban fa-5x" aria-hidden="true" style="color: red;"></i></div> \
                                    <div class="col-9" style="height: 100%; color: black; display: flex; align-items: center;"><h4></h4></div> \
                                    </div>';
        Object.keys(trackingOptions).forEach(function(key) {
            trackedIndividuals = trackedIndividuals.concat(
                '<div class="row" style="width: 100%; height: calc(10%*2/90*100); margin: 0;"> \
                <div class="col-3" style="height: 100%; background-image: ' + trackingOptions[key] + '; background-size: contain; background-repeat: no-repeat;"></div> \
                <div class="col-9" style="height: 100%; color: black; display: flex; align-items: center;"><h4>' + key + '</h4></div> \
                </div>'
            );
        });
        $('#trackedIndividualOptions').html(trackedIndividuals);
    });

    // Initialization
    $.get('http://localhost:3000/cameras/getCameras', function(cameras) {
        $.get('http://localhost:3000/history/getFilters', function(filters) {
            $('#similarity').val(filters.similarity);
            $('#trackedIndividualOptions .row').each(function() {
                if ($(this).find('h4').html() == filters.identifier) {
                    $('#trackedIndividualDisplayed').html($(this).html());
                    return false;
                }
            });
            for (let i = 0; i < cameras.length; i++) {
                if (filters.cameras.includes(cameras[i].cameraName)) {
                    selectedCameras.push(cameras[i].cameraName);
                }
            }
            $('#cameraSelectionButton').text(selectedCameras.length + ' camera(s) selected');
            updateHistoricalRows(filters.identifier);
            //From and to parts
        });
    });

    // Fired when user clicks on the currently tracked individual (display)
    $('#trackedIndividualDisplayed').on('click', function(e) {
        e.stopPropagation();
        $('#trackedIndividualOptions').show();
        $('body').click( function(e) {
            if (e.target.id !== 'trackedIndividualOptions') {
                e.stopPropagation();
                $('#trackedIndividualOptions').hide();
            }
        });
    });

    // Fired when user selects another individual to track
    $('body').on('click', '#trackedIndividualOptions > .row', function() {
        $.ajax({url: 'http://localhost:3000/history/updateFilters', type: 'PUT', data: {
            identifier: $(this).find('h4').html()
        }});
        $(this).parent().hide();
        $('#trackedIndividualDisplayed').html($(this).get(0).outerHTML);
        $('#trackedIndividualOptions .row').show();
        $(this).hide();
        $('#trackedIndividualDisplayed .row').css('height', '100%');
        if ($('#trackedIndividualDisplayed h4').html() == '') {
            $('#historyTable tbody').empty();
            $('#fullImage').attr('src', '');
        } else {
            updateHistoricalRows($('#trackedIndividualDisplayed h4').html());
        }
    });

    // Displays the modal to select the cameras to filter historical data
    $('#cameraSelectionButton').on('click', function() {
        $.get('http://localhost:3000/cameras/getCameras', function(cameras) {
            let camerasHTML = '';
            for (let i = 0; i < cameras.length; i++) {
                camerasHTML += '<tr class="camToDisplay"><td>' + cameras[i].cameraName + '</td><td class="camSelection text-center"><i class="fa fa-check" aria-hidden="true" style="color: green; display: none;"></i></td></tr>';
            }
            $('#cameraSelectionTable tbody').html(camerasHTML);
            $('#cameraSelectionModal').modal('show');
            $('.camToDisplay').each(function() {
                if (selectedCameras.includes($(this).find('td').first().html())) {
                    selectedCameras.splice(selectedCameras.indexOf($(this).find('td').first().html()), 1);
                    $(this).click();
                }
            });
        });
    });

    // Updates the cameras filter
    $('#cameraSelectionModalOK').on('click', function() {
        const cameras = (selectedCameras.length === 0) ? '[]' : selectedCameras;
        $.ajax({url: 'http://localhost:3000/history/updateFilters', type: 'PUT', data: {
            cameras: cameras
        }}).done(function() {
            updateHistoricalRows($('#trackedIndividualDisplayed h4').html());
        });
        $('#cameraSelectionModal').modal('hide');
        $('#cameraSelectionButton').text(selectedCameras.length + ' camera(s) selected');
    });

    // Fired when the similarity has changed
    $('#similarity').on('focusout', function() {
        $.ajax({url: 'http://localhost:3000/history/updateFilters', type: 'PUT', data: {
            similarity: $(this).val()
        }}).done(function() {
            updateHistoricalRows($('#trackedIndividualDisplayed h4').html());
        });
    });

    // Fired when the user select/deselect a camera in the filters
    $('body').on('click', '#cameraSelectionTable tr', function() {
        if ($(this).attr('class').split(' ').includes('camSelected')) {
            $(this).find('.camSelection i').hide();
            $(this).removeClass('camSelected');
            selectedCameras.splice(selectedCameras.indexOf($(this).find('td').first().html()), 1);
        } else {
            $(this).find('.camSelection i').show();
            $(this).addClass('camSelected');
            selectedCameras.push($(this).find('td').first().html());
        }
    });

    // Displays the full image in which the face has been detected
    $('body').on('click', '#historyTable tbody tr', function() {
        $.get('http://localhost:3000/history/getFullImage', {
            identifier: $('#trackedIndividualDisplayed h4').html(),
            similarity: $(this).find('td:nth-child(2)').html(),
            date: $(this).find('td:nth-child(5)').html()
        }, function(fullImage) {
            console.log('fullImage : ' + fullImage);
            const base64String = btoa(new Uint8Array(fullImage.data).reduce(function(data, byte) {
                return data + String.fromCharCode(byte);
            }, ''));
            $('#fullImage').attr('src', 'data:image/png;base64,' + base64String);
        });
        $('#historyTable tr').css('color', 'black');
        $('#historyTable tr').css('background-color', 'white');
        $(this).css('color', 'white');
        $(this).css('background-color', 'dimgrey');
    });

});

// Appends one historical row to the table
function addHistoricalRow(historicalRow, fromMemory) {
    const detectedFace = (fromMemory)? historicalRow.detectedFace.data : historicalRow.detectedFace;
    const base64String = btoa(new Uint8Array(detectedFace).reduce(function(data, byte) {
        return data + String.fromCharCode(byte);
    }, ''));
    $('#historyTable tbody').append(
        '<tr> \
        <td><img src="data:image/png;base64,' + base64String + '" style="height: auto; width: 100%;"></td> \
        <td>' + historicalRow.similarity + '</td> \
        <td>' + historicalRow.camera + '</td> \
        <td>' + historicalRow.state + '</td> \
        <td>' + historicalRow.date + '</td> \
        </tr>'
    );
}

// Updates the historical table when a filter changes
function updateHistoricalRows(identifier) {
    $('#historyTable tbody').empty();
    $('#fullImage').attr('src', '');
    if (identifier !== '') {
        $.get('http://localhost:3000/history/getHistory', {
            identifier: identifier
        }, function (historicalRows) {
            if (historySocket !== null) historySocket.close();
            if (historicalRows !== undefined) {
                for (let i = 0; i < historicalRows.length; i++) {
                    addHistoricalRow(historicalRows[i], true);
                }
                $('#historyTable tbody tr').first().click();
            }
            historySocket = io.connect('http://127.0.0.1:1025');
            historySocket.on('historicalRow', function (data) {
                addHistoricalRow(data, false);
            });
        });
    }
}