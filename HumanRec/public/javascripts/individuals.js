let mergeMode = false;
let selectedIndividuals = [];
let $lastSelectedImageIndex;
let unknownSocket = null;

$(function() {

    localStorage.clear();

    // Adds all detected individuals by the system (initialization)
    addToIndividualsTable('all', function() {
        $('#individualsTable tbody tr').first().click();
    });

    // Creates the server socket to receive individuals data
    $.ajax({url: 'http://localhost:3000/cameras/createIndividualsSocket', type: 'POST'}).done(function() {
        unknownSocket = io.connect('http://127.0.0.1:1026');
        unknownSocket.on('unknownIndividualRow', function (data) {
            const detectedFace = JSON.parse(data).image.data;
            const base64String = btoa(new Uint8Array(detectedFace).reduce(function(data, byte) {
                return data + String.fromCharCode(byte);
            }, ''));
            addIndividual(JSON.parse(data).IDName, '-', '-', '-', 'no', 'no', ['url("data:image/png;base64,' + base64String + '")']);
        });
    });

    // Enters the individuals merging mode
    $('#mergeEnter').on('click', function() {
        mergeMode = !mergeMode;
        $('#individualsMergingModal').modal('show');
        setTimeout(function() { $('#individualsMergingModal').modal('hide'); }, 10000);

        $('#IDName').val(''); $('#age').val(''); $('#description').val('');  $('#comment').val('');
        $('#bigPic').css('background-image', '');
        $('#mini .miniPic').remove();
        $('#mini .row').css('background-color', 'dimgrey');

        $('.fa-trash-o').hide();
        $('#tracking').attr('disabled', 'disabled');
        $('#applyChanges').attr('disabled', 'disabled');
        $('#IDName').attr('disabled', 'disabled');
        $('#age').attr('disabled', 'disabled');
        $('#description').attr('disabled', 'disabled');
        $('#comment').attr('disabled', 'disabled');
        $(this).hide();
        $('#mergeControls').show();
        $('#individualsTable tr').css('color', 'black');
        $('#individualsTable tr').css('background-color', 'white');
    });

    // Merges individuals and exit the merging mode
    $('#mergeConfirm').on('click', function() {
        mergeMode = !mergeMode;
        if (selectedIndividuals.length >= 2) {
            const targetIdentifier = selectedIndividuals[selectedIndividuals.length - 1].find('.IDName').html();
            let isTrackingRequired = false;
            let identifiers = [];
            for (let i = 0; i < selectedIndividuals.length; i++) {
                identifiers.push(selectedIndividuals[i].find('.IDName').html());
                if (!isTrackingRequired && selectedIndividuals[i].find('.tracking').html() === 'yes') {
                    isTrackingRequired = true;
                }
            }
            identifiers.splice(identifiers.indexOf(targetIdentifier), 1);
            $.ajax({url: 'http://localhost:3000/individuals/mergeImages', type: 'PUT', data: {
                identifiers: identifiers,
                targetIdentifier: targetIdentifier
            }}).done(function() {
                $.ajax({url: 'http://localhost:3000/history/mergeHistories', type: 'PUT', data: {
                    identifiersToMerge: identifiers,
                    targetIdentifier: targetIdentifier
                }}).done(function() {
                    if (isTrackingRequired) {
                        localStorage.setItem(targetIdentifier, 'merge_' + JSON.stringify(identifiers));
                    }
                    localStorage.setItem(targetIdentifier, $('#miniSide .miniPic').first().css('background-image').replace(/"/g, ''));
                });
                for (let i = 0; i < selectedIndividuals.length; i++) {
                    if (selectedIndividuals[i].find('.IDName').html() === targetIdentifier) {
                        selectedIndividuals[i].click();
                    } else {
                        selectedIndividuals[i].find('.fa-trash-o').click();
                    }
                }

                $('.fa-trash-o').show();
                $('#tracking').removeAttr('disabled');
                $('#applyChanges').removeAttr('disabled');
                $('#IDName').removeAttr('disabled');
                $('#age').removeAttr('disabled');
                $('#description').removeAttr('disabled');
                $('#comment').removeAttr('disabled');
                $('#mergeControls').hide();
                $('#mergeEnter').show();

                if (isTrackingRequired && (selectedIndividuals[selectedIndividuals.length - 1].find('.tracking').html() === 'no')) {
                    $('#tracking').click();
                }
                selectedIndividuals = [];
            });
        } else {
            selectedIndividuals = [];
            $('.fa-trash-o').show();
            $('#tracking').removeAttr('disabled');
            $('#applyChanges').removeAttr('disabled');
            $('#IDName').removeAttr('disabled');
            $('#age').removeAttr('disabled');
            $('#description').removeAttr('disabled');
            $('#comment').removeAttr('disabled');
            $('#mergeControls').hide();
            $('#mergeEnter').show();
        }
    });

    // Exit the merging mode
    $('#mergeCancel').on('click', function() {
        mergeMode = !mergeMode;
        selectedIndividuals = [];
        $('.fa-trash-o').show();
        $('#tracking').removeAttr('disabled');
        $('#applyChanges').removeAttr('disabled');
        $('#IDName').removeAttr('disabled');
        $('#age').removeAttr('disabled');
        $('#description').removeAttr('disabled');
        $('#comment').removeAttr('disabled');
        $('#mergeControls').hide();
        $('#mergeEnter').show();
        $('#individualsTable tbody tr').first().click();
    });

    // Displays the modal to add an individual to the system
    $('#addPerson').on('click', function() {
        $('#individualCreationModal').modal('show');
    });

    // Adds an individual to the system
    $('#addPersonConfirmation').on('click', function() {
        let identifier = $('#IDNameModal').val();
        let age = $('#ageModal').val();
        let description = $('#descriptionModal').val();
        let comment = $('#commentModal').val();
        let images = [];
        $('#miniModal').find('.miniPic').each(function() {
            let backgroundURL = $(this).css('background-image');
            images.push(backgroundURL);
        });
        addIndividual(identifier, age, description, comment, 'yes', 'no', images);
    });

    // Enables/Disables tracking on an individual
    $('#tracking').on('click', function() {
        let $individual = findSelectedIndividuals()[0];
        if ($individual.find('.tracking').html() === 'no') {
            $.ajax({url: 'http://localhost:3000/individuals/updateIndividual', type: 'PUT', data: {
                identifier: $individual.find('.IDName').html(),
                tracking: 'yes'
            }}).done(function() {
                $individual.find('.tracking').html('yes');
                $.ajax({url: 'http://localhost:3000/history/updateFilters', type: 'PUT', data: {
                    addTrackingIdentifier: $individual.find('.IDName').html()
                }}).done(function() {
                    localStorage.setItem($individual.find('.IDName').html(), $('#miniSide .miniPic').first().css('background-image').replace(/"/g, ''));
                    $('#tracking').text('Disable tracking');
                });
            });
        } else {
            $.ajax({url: 'http://localhost:3000/individuals/updateIndividual', type: 'PUT', data: {
                identifier: $individual.find('.IDName').html(),
                tracking: 'no'
            }}).done(function() {
                $individual.find('.tracking').html('no');
                $.ajax({url: 'http://localhost:3000/history/updateFilters', type: 'PUT', data: {
                    removeTrackingIdentifier: $individual.find('.IDName').html()
                }}).done(function() {
                    localStorage.removeItem($individual.find('.IDName').html());
                    $('#tracking').text('Enable tracking');
                });
            });
        }
    });

    // Updates information about an individual
    $('#applyChanges').on('click', function() {
        let $individual = findSelectedIndividuals()[0];
        const oldIDName = $individual.find('.IDName').html();           const newIDName = $('#IDName').val();
        const oldAge = $individual.find('.age').html();                 const newAge = $('#age').val();
        const oldDescription = $individual.find('.description').html(); const newDescription = $('#description').val();
        const oldComment = $individual.find('.comment').html();         const newComment = $('#comment').val();

        if (oldIDName !== newIDName && $individual.find('.tracking').html() == 'yes') {
            $.get('http://localhost:3000/history/getFilters', function(filters) {
                let data = {
                    addTrackingIdentifier: newIDName,
                    removeTrackingIdentifier: oldIDName
                };
                if (filters.identifier === oldIDName) {
                    data["identifier"] = newIDName;
                }
                $.ajax({url: 'http://localhost:3000/history/updateFilters', type: 'PUT', data: data}).done(function() {
                    $.ajax({url: 'http://localhost:3000/history/updateHistoryIdentifier', type: 'PUT', data: {
                        oldIdentifier: oldIDName,
                        newIdentifier: newIDName
                    }}).done(function() {
                        localStorage.setItem(oldIDName, 'newIdentifier_' + newIDName);
                    });
                });
            });
        }

        $.ajax({url: 'http://localhost:3000/individuals/updateIndividual', type: 'PUT', data: {
            oldIdentifier: oldIDName,       newIdentifier: newIDName,
            oldAge: oldAge,                 newAge: newAge,
            oldDescription: oldDescription, newDescription: newDescription,
            oldComment: oldComment,         newComment: newComment
        }}).done(function() {
            $individual.find('.IDName').html(newIDName);
            $individual.find('.age').html(newAge);
            $individual.find('.description').html(newDescription);
            $individual.find('.comment').html(newComment);
            if (!newIDName.startsWith('ID_')) {
                $individual.find('.known').html('yes');
            }
        });
    });

    // Removes an individual from the system
    $('body').on('click', '.fa-trash-o', function(e) {
        e.stopPropagation();
        const identifier = $(this).parent().siblings('.IDName').html();
        const $tr = $(this).parent().parent();
        $.ajax({url: 'http://localhost:3000/individuals/removeIndividual', type: 'DELETE', data: {
            identifier: identifier
        }}).done(function() {
            $.ajax({url: 'http://localhost:3000/history/removeHistory', type: 'DELETE', data: {
                identifier: identifier
            }}).done(function() {
                $.ajax({url: 'http://localhost:3000/history/updateFilters', type: 'PUT', data: {
                    removeTrackingIdentifier: identifier
                }}).done(function() {
                    localStorage.removeItem(identifier);
                    if ($tr.next().length > 0) {
                        $tr.next().click();
                    } else if ($tr.prev().length > 0) {
                        $tr.prev().click();
                    } else {
                        // Would like to display a panel with "No detected Individual"
                        $('#IDName').val('');
                        $('#age').val('');
                        $('#description').val('');
                        $('#comment').val('');
                        $('#miniSide .row').empty();
                        $('#miniBottom').empty();
                        $('#miniSide .row').css('background-color', 'dimgrey');
                        $('#miniBottom .col').css('background-color', 'dimgrey');
                        $('#bigPic').css('background-image', 'none');
                    }
                    $tr.remove();
                });
            });
        });
    });

    // Displays information and pictures of an individual
    $('body').on('click', '#individualsTable tr', function() {
        let $this;
        if (!mergeMode) {
            $('#individualsTable tr').css('color', 'black');
            $('#individualsTable tr').css('background-color', 'white');
            $(this).css('color', 'white');
            $(this).css('background-color', 'dimgrey');
            $this = $(this);
        } else {
            if ($(this).css('background-color') === 'rgb(105, 105, 105)') {     // Test if background-color is dimgrey
                let index;
                for (let i = 0; i < selectedIndividuals.length; i++) {
                    if ($(this).find('.IDName').html() === selectedIndividuals[i].find('.IDName').html()) {
                        index = i;
                        break;
                    }
                }
                $(this).css('background-color', 'white');
                $(this).css('color', 'black');
                selectedIndividuals.splice(index, 1);
            } else {
                $(this).css('background-color', 'dimgrey');
                $(this).css('color', 'white');
                selectedIndividuals.push($(this));
            }
            $this = selectedIndividuals[selectedIndividuals.length - 1];
        }
        $('#IDName').val($this.find('.IDName').html());
        $('#age').val($this.find('.age').html());
        $('#description').val($this.find('.description').html());
        $('#comment').val($this.find('.comment').html());
        const tracking = $this.find('.tracking').html();
        if (tracking === 'no') {
            $('#tracking').text('Enable tracking');
        } else {
            $('#tracking').text('Disable tracking');
        }
        $('#miniSide .row').empty();
        $('#miniBottom').empty();
        $.get('http://localhost:3000/individuals/getOneIndividual', {
            identifier: $this.find('.IDName').html()
        }, function (individual) {
            for (let i = 0; i < individual.images.length; i++) {
                displayMiniPic('<div class="miniPic" style="height: 100%; width: 100%; background-image: url(' + individual.images[i].base64Img + '); background-size: contain; background-repeat: no-repeat; background-position: center center;"></div>');
            }
            $('.miniPic').first().click();
        });
    });

    // Fired when a new picture is selected for a new individual
    $('#fileExplorerModal').change(function() {
        const reader = new FileReader();
        reader.readAsDataURL($('#fileExplorerModal').prop('files')[0]);
        reader.onload = function(event) {
            displayMiniPic('<div class="miniPic" style="height: 100%; width: 100%; background-image: url(' + event.target.result + '); background-size: contain; background-repeat: no-repeat; background-position: center center;"></div>', true);
        };
    });

    // Fired when a new picture is selected for an existing individual
    $('#fileExplorer').change(function() {
        const reader = new FileReader();
        reader.readAsDataURL($('#fileExplorer').prop('files')[0]);
        reader.onload = function(event) {
            displayMiniPic('<div class="miniPic" style="height: 100%; width: 100%; background-image: url(' + event.target.result + '); background-size: contain; background-repeat: no-repeat; background-position: center center;"></div>', false);
            const $individual = findSelectedIndividuals()[0];
            $.ajax({url: 'http://localhost:3000/individuals/addImages', type: 'PUT', data: {
                identifier: $individual.find('.IDName').html(),
                images: [event.target.result]
            }});
        };
    });

    // Removes a picture of an individual
    $('#deleteImg').on('click', function() {
        let imageWithURL = $('#bigPic').css('background-image');
        reorganizeImgs(imageWithURL);
        const $individual = findSelectedIndividuals()[0];
        $.ajax({url: 'http://localhost:3000/individuals/removeImage', type: 'PUT', data: {
            identifier: $individual.find('.IDName').html(),
            image: imageWithURL.substring(5, imageWithURL.length - 2)
        }});
    });

    // Displays a picture in the big area for an existing individual
    $('body').on('click', '#mini .miniPic', function() {
        $('#miniSide .row').css('background-color', 'dimgrey');
        $('#miniBottom .col').css('background-color', 'dimgrey');
        $(this).parent().css('background-color', 'black');
        $('#bigPic').css('background-image', $(this).css('background-image'));
        $lastSelectedImageIndex = $('.miniPic').index($(this));
    });

    // Displays a picture in the big area for a new individual
    $('body').on('click', '#miniModal .miniPic', function() {
        $('#miniModal .miniPic').parent().css('background-color', 'white');
        $(this).parent().css('background-color', 'black');
        $('#bigPicModal').css('background-image', $(this).css('background-image'));
    });

});

// Adds an individual to the system
function addIndividual(identifier, age, description, comment, known, tracking, images) {
    $.ajax({url: 'http://localhost:3000/individuals/addIndividual', type: 'POST', data: {
        identifier: identifier,
        age: age,
        description: description,
        comment: comment,
        known: known,
        tracking: tracking,
        images: images
    }}).done(function() {
        addToIndividualsTable(identifier, function() {
            if ($('#individualsTable tbody tr').length === 1) {
                $('#individualsTable tbody tr').first().click();
            }
            $('#individualCreationModal').modal('hide');
            $('#IDNameModal').val(''); $('#ageModal').val(''); $('#descriptionModal').val('');  $('#commentModal').val('');
            $('#bigPicModal').css('background-image', '');
            $('#miniModal .miniPic').remove();
            $('#miniModal .row').css('background-color', 'white');
        });

    });
}

// Adds one or all individual(s) to the table
function addToIndividualsTable(identifier, callback) {
    if (identifier === 'all') {
        $.get('http://localhost:3000/individuals/getAllIndividuals', function (individuals) {
            let entries = '';
            for (let key in individuals) {
                entries = entries.concat(
                    '<tr> \
                    <td style="vertical-align: middle;" class="IDPicture"><img src="' + individuals[key].images[0].base64Img + '" style="height: auto; width: 100%;"></td> \
                    <td style="vertical-align: middle;" class="IDName">' + key + '</td> \
                    <td style="vertical-align: middle;" class="age">' + individuals[key].age + '</td> \
                    <td style="vertical-align: middle;" class="description">' + individuals[key].description + '</td> \
                    <td style="vertical-align: middle;" class="comment">' + individuals[key].comment + '</td> \
                    <td style="vertical-align: middle;" class="known">' + individuals[key].known + '</td> \
                    <td style="vertical-align: middle;" class="tracking">' + individuals[key].tracking + '</td> \
                    <td style="vertical-align: middle;"><i class="fa fa-trash-o fa-2x" aria-hidden="true" style="color: red;"></i></td> \
                    </tr>'
                );
            }
            $('#individualsTable tbody').html(entries);
            callback();
        });
    } else {
        $.get('http://localhost:3000/individuals/getOneIndividual', {
            identifier: identifier
        }, function (individual) {
            let entry = '<tr> \
                        <td style="vertical-align: middle;" class="IDPicture"><img src="' + individual.images[0].base64Img + '" style="height: auto; width: 100%;"></td> \
                        <td style="vertical-align: middle;" class="IDName">' + identifier + '</td> \
                        <td style="vertical-align: middle;" class="age">' + individual.age + '</td> \
                        <td style="vertical-align: middle;" class="description">' + individual.description + '</td> \
                        <td style="vertical-align: middle;" class="comment">' + individual.comment + '</td> \
                        <td style="vertical-align: middle;" class="known">' + individual.known + '</td> \
                        <td style="vertical-align: middle;" class="tracking">' + individual.tracking + '</td> \
                        <td style="vertical-align: middle;"><i class="fa fa-trash-o fa-2x" aria-hidden="true" style="color: red;"></i></td> \
                        </tr>';
            $('#individualsTable tbody').append(entry);
            callback();
        });
    }
}

// Finds the selected individuals in the table
function findSelectedIndividuals() {
    let individuals = [];
    $('#individualsTable tr').each(function() {
        if ($(this).css('background-color') === 'rgb(105, 105, 105)') {     // Test if background-color is dimgrey
            individuals.push($(this));
        }
    });
    return individuals;
}

// When a picture is removed, all pictures are reorganized
function reorganizeImgs(ImgToRemove) {
    let $individual = findSelectedIndividuals()[0];
    let miniPics = [];
    $('#mini .miniPic').each(function() {
        miniPics.push($(this).css('background-image'));
    });
    miniPics.splice(miniPics.indexOf(ImgToRemove), 1);
    $('#miniBottom').empty();
    $('#miniSide .row').empty();
    for (let i = 0; i < miniPics.length; i++) {
        displayMiniPic('<div class="miniPic" style="height: 100%; width: 100%; background-image: ' + miniPics[i].replace(/"/g, '') + '; background-size: contain; background-repeat: no-repeat; background-position: center center;"></div>', false);
    }
    if ($lastSelectedImageIndex === $('.miniPic').length && $lastSelectedImageIndex !== 0) {    // Not 'length - 1' because an image has already been removed
        $('.miniPic:eq(' + ($lastSelectedImageIndex - 1) + ')').click();
    } else {
        $('.miniPic:eq(' + ($lastSelectedImageIndex) + ')').click();
        if ($lastSelectedImageIndex === 0) {
            const bigPicWithURL = $('#bigPic').css('background-image');
            $individual.find('.IDPicture img').attr('src', bigPicWithURL.substring(5, bigPicWithURL.length - 2));
            if ($individual.find('.tracking').html() === 'yes') {
                localStorage.setItem($individual.find('.IDName').html(), bigPicWithURL.replace(/"/g, ''));
            }
        }
    }
}

// Adds a picture to the side or bottom area
function displayMiniPic(img, isModal) {
    let hasFoundAPlace = false;
    if (isModal) {
        $('#miniSideModal').find('.row').each(function() {  //First tries to place the picture on the side
            if ($(this).html() === '') {
                $(this).html(img);
                hasFoundAPlace = true;
                return false;
            }
        });
    } else {
        $('#miniSide').find('.row').each(function() {       //First tries to place the picture on the side
            if ($(this).html() === '') {
                $(this).html(img);
                hasFoundAPlace = true;
                return false;
            }
        });
    }
    if (hasFoundAPlace) return;
    hasFoundAPlace = false;
    if (isModal) {
        $('#miniBottomModal').find('.col').each(function() {
            if ($(this).html() === '') {
                $(this).html(img);
                hasFoundAPlace = true;
                return false;
            }
        });
    } else {
        $('#miniBottom').find('.col').each(function() {
            if ($(this).html() === '') {
                $(this).html(img);
                hasFoundAPlace = true;
                return false;
            }
        });
    }
    if (hasFoundAPlace) return;
    if (isModal) {
        $('#miniBottomModal').append('<div class="row" style="width: 100%; height: calc(60%*100/40/3); margin: 0;"><div class="col" style="height: 100%;">' + img + '</div><div class="col"></div><div class="col"></div><div class="col"></div></div>');
    } else {
        $('#miniBottom').append('<div class="row" style="width: 100%; height: calc(60%*100/40/3); margin: 0;"><div class="col" style="height: 100%;">' + img + '</div><div class="col"></div><div class="col"></div><div class="col"></div></div>');
    }
}