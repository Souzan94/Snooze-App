var client = ZAFClient.init();
client.invoke('resize', {
    height: '430px'
});
var ticketId, remainingTimeValue;
var dropdownContainer = document.getElementById("dropdownContainer");
var container = document.getElementById("container");
var dropdownContent = document.querySelector(".dropdown-content");
var timerHint = document.getElementById("timerHint");
var progressBar = document.getElementById("progressBar");
var create = document.getElementById("createBtn");
var customstart = document.getElementById("createBtn2");
var operationsList = document.getElementById("oplist");

var unitSelect = document.getElementById("unitSelect");
var durationList = document.getElementById("defaultDurations");
var timeInput = document.getElementById("timeInput");
var stopOption = document.getElementById("stopOption");
var restartOption = document.getElementById("restartOption");
var deleteOption = document.getElementById("deleteOption");
var statusLabel = document.getElementById("status");
var mainForm = document.getElementById("siderbarContent");
var unitSelectValue;
var timeInputValue;
var hint = document.getElementById("hint");
var authToken, clientSecret;
var clientID = 'zdg-omniwise-apps';
var intervalId, statusID, token, selectedDuration, timerStatus, subdomain, role, currentUser, appId;
var userId = '';
var snoozeFieldId ='';
let isSnoozeFieldEnabled = false; 
client.metadata().then(function(metadata) {
    statusID = metadata.settings.statusId;
    appId = metadata.appId;

});
var intervalStartTime;

document.addEventListener("DOMContentLoaded", function() {
    client.context().then(function(context) {
        subdomain = context.account.subdomain;

        client.get('currentUser').then(function(data) {
            currentUser = data.currentUser.id;
            role = data.currentUser.role;
            client.get("ticket.assignee").then(function(result) {
                var assignee = result["ticket.assignee"];
                if (assignee) {
                    userId = assignee.user ? assignee.user.id : '';
                }




                isClientAuthorized().then(result => {
                    if (result.authorized) {
                        document.getElementById('mainDiv').style.display = 'block';
                        document.getElementById('activationDiv').style.display = 'none';
                        authToken = result.accessToken;
                    } else {
                        document.getElementById('mainDiv').style.display = 'none';
                        document.getElementById('activationDiv').style.display = 'block';
                    }
                }).catch(error => {
                    console.error('Authorization check failed:', error);
                });

                getSettings().then(settings => {
                    if (settings.isSnoozefieldChecked && settings.snoozefieldId) {
                        snoozeFieldId = settings.snoozefieldId;
                        isSnoozeFieldEnabled = true;
                    } else {
                        isSnoozeFieldEnabled = false;

                    }
                }).catch(error => {
                    console.error('Error getting settings:', error);
                });

                isAppAdmin(subdomain, currentUser).then(isAdmin => {

                    if (isAdmin) {

                        mainForm.style.display = 'block';
                        operationsList.style.display = 'block';
                    }

                });

                if (role === 'admin') {

                    operationsList.style.display = 'block';

                    mainForm.style.display = 'block';

                }
                selectedDuration = durationList.value;

                client.get("ticket.id").then(function(result) {
                    ticketId = result["ticket.id"];


                    var payload = {
                        payload: {
                            "Key": {
                                "id": subdomain,
                                "ticket": ticketId
                            },
                            "AttributeUpdates": {
                                "currentTime": {
                                    "Value": new Date().toLocaleString()
                                }
                            }
                        }
                    };



                    client.request({
                        url: 'https://sgqnegab5f.execute-api.us-east-1.amazonaws.com/snoozeAPP/updateTimer',
                        type: 'POST',
                        contentType: 'application/json',
                        data: JSON.stringify(payload)
                    }).then(response => {
                        if (response.statusCode === 404) {} else {
                            const responseBody = JSON.parse(response.body);
                            //   const remainingMilliseconds = responseBody.remainingMilliseconds;
                            // const totalMilliseconds = responseBody.timeValueInMilliseconds;
                            const duedate = responseBody.dueDate;
                            const startdate = responseBody.startDate;
                            timerStatus = responseBody.status;
                            unitSelectValue = responseBody.unit;
                            timeInputValue = responseBody.timeValue;
                            if (timerStatus === "stopped") {
                                statusLabel.textContent = "Stopped";
                                resetMenu("none", "block");


                            }
                            setHint(unitSelectValue, timeInputValue);
                            loadTimerFromDB(startdate, duedate, timerStatus);
                        }
                    }).catch(error => {
                        // Handle errors
                        console.error(error);
                    });

                });

            });
        });
    });
});

var selectedDuration;

durationList.addEventListener("change", function() {
    selectedDuration = durationList.value;
    if (selectedDuration === "new") {
        document.getElementById("newDurationContainer").style.display = "block";
        customstart.style.display = "none";
    } else {
        document.getElementById("newDurationContainer").style.display = "none";
        customstart.style.display = "block";

        var durationMapping = {
            "5m": {
                unit: "minutes",
                time: 5
            },
            "10m": {
                unit: "minutes",
                time: 10
            },
            "30m": {
                unit: "minutes",
                time: 30
            },
            "1h": {
                unit: "hours",
                time: 1
            },
            "2h": {
                unit: "hours",
                time: 2
            },
			 "12h": {
                unit: "hours",
                time: 12
            },
			 "24h": {
                unit: "hours",
                time: 24
            }
            // Add more mappings for other options if needed
        };


        if (selectedDuration in durationMapping) {
            var mapping = durationMapping[selectedDuration];
            unitSelectValue = mapping.unit;
            timeInputValue = mapping.time;


        } else {
            client.invoke('notify', 'Invalid duration selected', 'error');
        }
    }


});



unitSelect.addEventListener("change", function() {
    var selectedUnit = unitSelect.value;
    if (selectedUnit === "seconds") {
        hint.textContent = "Enter a value between 25 and 604800";
    }
    if (selectedUnit === "minutes") {
        hint.textContent = "Enter a value between 1 and 10080";
    }

    if (selectedUnit === "hours") {
        hint.textContent = "Enter a value between 1 and 168";
    }
});


create.addEventListener("click", function() {
	
	 if (!isSnoozeFieldEnabled) {
        notifyALLUsers("addTimer", ticketId);
        hint.textContent = "";
        return;
    }
	
 unitSelectValue = unitSelect.value;
 timeInputValue = timeInput.value;

    const inputInSeconds = convertToSeconds(timeInput.value, unitSelect.value);


    // Get current value, add input, then update
    getSnoozeFieldValue(ticketId)
        .then(currentValue => {
            const newTotal = currentValue + inputInSeconds;
            return updateSnoozeField(ticketId, newTotal);
        })
        .then(() => {
            notifyALLUsers("addTimer", ticketId);
            hint.textContent = "";
        })
        .catch(err => {
            console.error("Error updating snooze field:", err);
        });
		});

function getSnoozeFieldValue(ticketId) {
    return client.request({
        url: `/api/v2/tickets/${ticketId}.json`,
        type: 'GET',
        contentType: 'application/json'
    }).then(response => {
        const field = response.ticket.custom_fields.find(f => f.id === snoozeFieldId);
        return field ? parseInt(field.value, 10) || 0 : 0;
    });
}

function updateSnoozeField(ticketId, value) {
    return client.request({
        url: `/api/v2/tickets/${ticketId}.json`,
        type: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify({
            ticket: {
                custom_fields: [
                    {
                        id: snoozeFieldId, // Using the key
                        value: value
                    }
                ]
            }
        })
    }).then(response => {
        console.log(`Snooze field updated for ticket ${ticketId}:`, value);
    }).catch(error => {
        console.error('Error updating snooze field via API:', error);
    });
}

document.getElementById('activate').addEventListener('click', function(event) {
    renderAuthorizationPage(clientID);
});

function renderAuthorizationPage(clientId) {

    const url = `https://${subdomain}.zendesk.com/oauth/authorizations/new?response_type=code&redirect_uri=https://m0nskfyta8.execute-api.us-east-1.amazonaws.com/config/getGlobalAccessToken&client_id=${clientId}&scope=read%20write`;

    // Create the Basic Authentication token

    client.invoke('instances.create', {
        location: 'modal',
        url: url,
        size: {
            width: '700px',
            height: '700px'
        }
    }).then(function(data) {
        var instanceGuid = data['instances.create'][0].instanceGuid;
        var modalClient = client.instance(instanceGuid);
        modalClient.on('modal.close', function() {

            isClientAuthorized().then(result => {
                if (result.authorized) {
                    document.getElementById('mainDiv').style.display = 'block';
                    document.getElementById('activationDiv').style.display = 'none';
                    authToken = result.accessToken;
                } else {
                    document.getElementById('mainDiv').style.display = 'none';
                    document.getElementById('activationDiv').style.display = 'block';
                }
            }).catch(error => {
                console.error('Authorization check failed:', error);
            });




        });

    });


}




function notifyALLUsers(eventName, ticketId) {

    return client.request({
        url: `/api/v2/apps/notify`,
        type: "POST",
        contentType: "application/json",
        httpCompleteResponse: true,
        autoRetry: true,
        data: JSON.stringify({
            "app_id": appId,
            "event": eventName,
            "body": {
                "duration": selectedDuration,
                "unitselect": unitSelectValue,
                "timeInput": timeInputValue,
                "ticket": ticketId,
                "createdBy": currentUser

            }
        })
    }).then(response => {

        return response;
    }).catch(error => {
        console.error("Error sending notification:", error);

    });

}


client.on("api_notification.addTimer", function(data) {
    create.disabled = true;
    const bodyData = data.body;
    const ticket = bodyData.ticket;
    const user = bodyData.createdBy;
    const unit = bodyData.unitselect;
    const timevalue = bodyData.timeInput;
    if (ticket === ticketId) {
        statusLabel.textContent = "";
        unitSelectValue = unit;
        timeInputValue = timevalue;
        runTimer(ticket, user, unit, timevalue);
    }
});

client.on("api_notification.addCustomTimer", function(data) {
    customstart.disabled = true;
    const bodyData = data.body;
    const sd = bodyData.duration;
    const ticket = bodyData.ticket;
    const user = bodyData.createdBy;
    const unit = bodyData.unitselect;
    const timevalue = bodyData.timeInput;

    if (ticket === ticketId) {
        unitSelectValue = unit;
        timeInputValue = timevalue
        statusLabel.textContent = "";
        runCustomTimer(sd, user);
    }
});


client.on("api_notification.stopTimer", function(data) {
    const bodyData = data.body;
    const ticket = bodyData.ticket;
    const unit = bodyData.unitselect;
    const timevalue = bodyData.timeInput;
    const user = bodyData.createdBy;

    if (ticket === ticketId) {
        stopTimer(ticket, subdomain, user, unit, timevalue);
        statusLabel.textContent = "Stopped";
    }
});

client.on("api_notification.deleteTimer", function(data) {
    const bodyData = data.body;
    const ticket = bodyData.ticket;
    const unit = bodyData.unitselect;
    const timevalue = bodyData.timeInput;
    const user = bodyData.createdBy;
    if (ticket === ticketId) {
        dropdownContainer.style.display = "none";
        progressBar.style.width = "0%";
        timerHint.textContent = "";
        statusLabel.textContent = "";

        deleteTimer(ticketId, subdomain, user, unit, timevalue);
    }
});

client.on("api_notification.restartTimer", function(data) {
    const bodyData = data.body;
    const ticket = bodyData.ticket;
    const user = bodyData.createdBy;
    const unit = bodyData.unitselect;
    const timevalue = bodyData.timeInput;

    if (ticket === ticketId) {

        resetMenu("block", "none");
        statusLabel.textContent = "";

        startTimer(ticket, unit, timevalue, subdomain, user);

    }
});




customstart.addEventListener("click", function() {
	
		 if (!isSnoozeFieldEnabled) {
			   notifyALLUsers("addCustomTimer", ticketId);
               hint.textContent = "";
			 return;
		 }
	
    const inputInSeconds = convertToSeconds(timeInputValue, unitSelectValue);

 

    // Get current value, add input, then update
    getSnoozeFieldValue(ticketId)
        .then(currentValue => {
            const newTotal = currentValue + inputInSeconds;
            return updateSnoozeField(ticketId, newTotal);
        })
        .then(() => {
            notifyALLUsers("addCustomTimer", ticketId);
            hint.textContent = "";
        })
        .catch(err => {
            console.error("Error updating snooze field:", err);
        });
});



function runCustomTimer(selectedDuration, user) {

    var status;
    client.get("ticket.customStatus").then(function(result) {
        status = result["ticket.customStatus"].name;

        if (status === "Snooze") {

            if (user === currentUser) {
                client.invoke('notify', 'the ticket is already  Snoozed ', 'error');
            }
            customstart.disabled = false;
            return;
        }

        isTimerRunning(ticketId, subdomain).then((timerRunning) => {
            if (timerRunning) {
                if (user === currentUser) {
                    client.invoke('notify', 'There is already a timer existed for this ticket', 'error');
                }
                customstart.disabled = false;

                return;
            }
            resetMenu("block", "none");
            startTimer(ticketId, unitSelectValue, timeInputValue, subdomain, user);

        });


    });

}

function runTimer(ticketId, user, unit, time) {


    var status;
    client.get("ticket.customStatus").then(function(result) {
        status = result["ticket.customStatus"].name;


        if (status === "Snooze") {
            if (user === currentUser) {

                client.invoke('notify', 'the ticket is already  Snoozed ', 'error');
            }
            return;
        }


        isTimerRunning(ticketId, subdomain).then((timerRunning) => {
            if (timerRunning) {
                if (user === currentUser) {

                    client.invoke('notify', 'There is already a timer existed for this ticket', 'error');
                }
                return;
            }

            resetMenu("block", "none");




            startTimer(ticketId, unit, time, subdomain, user);

        });

    });



}


stopOption.addEventListener("click", function() {
	
	    if (!isSnoozeFieldEnabled) {
			    notifyALLUsers("stopTimer", ticketId);
                return;
		}
    const inputInSeconds = convertToSeconds(timeInputValue, unitSelectValue);

    getSnoozeFieldValue(ticketId)
        .then(currentValue => {
            // Ensure currentValue is at least 0
            const newTotal = Math.max((currentValue || 0) - inputInSeconds, 0);
            return updateSnoozeField(ticketId, newTotal);
        })
        .then(() => {
            notifyALLUsers("stopTimer", ticketId);
        })

        .catch(err => {
            console.error("Error updating snooze field:", err);
        });
});


restartOption.addEventListener("click", function() {

 if (!isSnoozeFieldEnabled) {
	     notifyALLUsers("restartTimer", ticketId);
	 return;
 }
    const inputInSeconds = convertToSeconds(timeInputValue, unitSelectValue);

    getSnoozeFieldValue(ticketId)
        .then(currentValue => {
            const newTotal = (currentValue || 0) + inputInSeconds;
            return updateSnoozeField(ticketId, newTotal);
        })
        .then(() => {
            notifyALLUsers("restartTimer", ticketId);
        })
        .catch(err => {
            console.error("Error updating snooze field:", err);
        });


});

deleteOption.addEventListener("click", function() {


    notifyALLUsers("deleteTimer", ticketId);




});




async function startTimer(ticketId, unitSelect, timeInput, domainName, user) {


    if (timeInput <= 0) {

        client.invoke('notify', 'You should enter a valid time interval', 'error');
        create.disabled = false;
        customstart.disabled = false;

        return;
    }

    if (unitSelect === "seconds") {

        if (timeInput < 25) {
            client.invoke('notify', 'time interval should be at least 25 seconds', 'error');
            create.disabled = false;
            customstart.disabled = false;

            return;

        }

        if (timeInput > 604800) {
            client.invoke('notify', 'time interval should be at max 7 days', 'error');
            create.disabled = false;
            customstart.disabled = false;

            return;

        }

    }
    if (unitSelect === "minutes") {

        if (timeInput > 10080) {
            client.invoke('notify', 'time interval should be at max 7 days', 'error');
            create.disabled = false;
            customstart.disabled = false;

            return;

        }

    }
    if (unitSelect === "hours") {


        if (timeInput > 168) {
            client.invoke('notify', 'time interval should be at max 7 days', 'error');
            create.disabled = false;
            customstart.disabled = false;

            return;

        }

    }


    var duration = 0;
    var hint = "";

    switch (unitSelect) {
        case "seconds":
            duration = timeInput * 1000;
            setHint(unitSelect, timeInput);

            break;
        case "minutes":
            duration = timeInput * 60 * 1000;
            setHint(unitSelect, timeInput);


            break;
        case "hours":
            duration = timeInput * 60 * 60 * 1000;
            setHint(unitSelect, timeInput);

            break;
        default:
            client.invoke('notify', 'Invalid duration selected', 'error');
            return;
    }

    var dueDate = new Date(Date.now() + duration);
    intervalStartTime = new Date();
    var dueDateISO = dueDate.toISOString();

    container.style.display = "block";

    dropdownContainer.style.display = "inline-block";

    // Log the end time of updateProgressBar
    if (user === currentUser) {



        updateTicket(ticketId, statusID, unitSelect, timeInput);



        const options = {
            url: "https://sgqnegab5f.execute-api.us-east-1.amazonaws.com/snoozeAPP/addTimer",
            type: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            accepts: "application/json",
            secure: true,
            data: JSON.stringify({
                payload: {
                    Item: {
                        id: domainName,
                        ticket: ticketId,
                        timeUnit: unitSelect,
                        timeValue: timeInput,
                        currentTime: new Date().toLocaleString(),
                        stoppingTime: "",
                        status: "running",
                        dueDate: dueDateISO,
                        token: authToken,
                        createdBy: user,
						ticketAssignee:userId,
						appId:appId
                    }
                }
            })
        };

        client.request(options).then(response => {}).catch(error => {
            console.error(error);
        });




    }
    updateProgressBar(dueDate);

}

function updateProgressBar(dueDate) {
    intervalId = setInterval(function() {
        var now = new Date();
        var remainingTime = dueDate - now;
        var hours = Math.floor(remainingTime / (1000 * 60 * 60));

        var minutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));
        var seconds = Math.floor((remainingTime % (1000 * 60)) / 1000);
        var formattedTime = (hours < 10 ? '0' : '') + hours + ':' + (minutes < 10 ? '0' : '') + minutes + ':' + (seconds < 10 ? '0' : '') + seconds;

        var progress;

        if (remainingTime <= 0) {
            clearInterval(intervalId);
            statusLabel.textContent = "Finished";
            resetMenu("none", "block");
            formattedTime = "00:00";
            progress = 100;
            create.disabled = false;
            customstart.disabled = false;

        } else {
            var totalTime = dueDate - intervalStartTime;
            progress = ((totalTime - remainingTime) / totalTime) * 100;
        }

        progressBar.style.width = progress + '%';
        progressBar.innerHTML = Math.round(progress) + '%';
        document.getElementById('countdownTimer').textContent = formattedTime;

    }, 1000);
}




/*function loadTimerFromDB(timeInput, totalTime, TimerStatus,duedate) {
    dropdownContainer.style.display = "inline-block";
    container.style.display = "block";

    if (timeInput <= 0) {

        var initialProgress = 100;

        progressBar.style.width = initialProgress + "%";
        statusLabel.textContent = "Finished";
        resetMenu("none", "block");
        return;

    }

    var initialProgress = ((totalTime - timeInput) / totalTime) * 100;


    if (TimerStatus !== "stopped") {

 var width = Math.floor(initialProgress);




 intervalId = setInterval(function() {
      if (width >= 100) {
		  
        clearInterval(intervalId);
		    statusLabel.textContent = "Finished";
			    resetMenu("none", "block");


      } else {
        width++;
        progressBar.style.width = width + '%';
        progressBar.innerHTML =   width * 1 + '%';
      }
    }, timeInput / 100);
    }
}*/


function loadTimerFromDB(startdate, duedate, TimerStatus) {
    dropdownContainer.style.display = "inline-block";
    container.style.display = "block";
    const startDate = new Date(startdate);
    const dueDate = new Date(duedate); // Parse due date string into a Date object

    // Check if the due date has passed
    if (new Date() >= dueDate) {
        progressBar.style.width = "100%"; // Set progress to 100%
        progressBar.innerHTML = "100%"; // Update progress bar text
        statusLabel.textContent = "Finished"; // Set status label
        resetMenu("none", "block"); // Reset menu
        return;
    }

    const totalTime = dueDate - startDate;

    if (TimerStatus !== "stopped") {
        intervalId = setInterval(function() {
            const currentTime = new Date();
            const remainingTime = dueDate - currentTime;
            var hours = Math.floor(remainingTime / (1000 * 60 * 60));

            var minutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));
            var seconds = Math.floor((remainingTime % (1000 * 60)) / 1000);
            var formattedTime = (hours < 10 ? '0' : '') + hours + ':' + (minutes < 10 ? '0' : '') + minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
            var progress;
            if (remainingTime <= 0) {
                clearInterval(intervalId);
                statusLabel.textContent = "Finished";
                resetMenu("none", "block");
                formattedTime = "00:00";

                progress = 100;
            } else {

                progress = ((totalTime - remainingTime) / totalTime) * 100;

            }

            progressBar.style.width = progress + '%';
            progressBar.innerHTML = Math.round(progress) + '%';
            document.getElementById('countdownTimer').textContent = formattedTime;

        }, 1000);
    }
}

async function stopTimer(ticket, domainName, user, unit, time) {

    clearInterval(intervalId);
    progressBar.innerHTML = '';

    resetMenu("none", "block");
    create.disabled = false;
    customstart.disabled = false;
    document.getElementById('countdownTimer').textContent = '';
    if (user === currentUser) {




        var payload = {
            payload: {
                "Key": {
                    "id": domainName,
                    "ticket": ticket
                },
                "AttributeUpdates": {
                    "stoppingTime": {
                        "Value": new Date().toLocaleString()
                    },

                    "status": {
                        "Value": "stopped"
                    }
                }
            }
        };



        client.request({
            url: 'https://sgqnegab5f.execute-api.us-east-1.amazonaws.com/snoozeAPP/stopTimer',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(payload)
        }).then(response => {
            updateTicket(ticket, "open", unit, time);

        }).catch(error => {
            // Handle errors
            console.error(error);
        });

    }
}

async function deleteTimer(ticket, domainName, user, unit, time) {

    clearInterval(intervalId);
    progressBar.innerHTML = '';
    document.getElementById('countdownTimer').textContent = '';
    create.disabled = false;
    customstart.disabled = false;
    if (user === currentUser) {




        var payload = {
            payload: {
                "Key": {
                    "id": domainName,
                    "ticket": ticket
                }
            }
        };

        client.request({
            url: 'https://sgqnegab5f.execute-api.us-east-1.amazonaws.com/snoozeAPP/deleteTimer',
            type: 'DELETE',
            contentType: 'application/json',
            data: JSON.stringify(payload)
        }).then(response => {
            updateTicket(ticket, "open", unit, time);


        }).catch(error => {
            // Handle errors
            console.error(error);
        });


    }
}



function resetMenu(stopStyle, restartStyle) {

    stopOption.style.display = stopStyle;
    restartOption.style.display = restartStyle;



}

function setHint(unit, time) {



    switch (unit) {
        case "seconds":
            timerHint.textContent = time + "s";

            break;
        case "minutes":
            timerHint.textContent = time + "m";

            break;
        case "hours":
            timerHint.textContent = time + "h";

            break;
        default:
            alert("Invalid unit selected.");
            return;
    }


}

function updateTicket(ticketID, updatedStatus, unit, time) {
    var payload, tags;




    if (updatedStatus === "open") {



        payload = {
            "ticket": {
                "status": updatedStatus
            }
        };
    } else {


        payload = {
            "ticket": {
                "custom_status_id": updatedStatus
            }
        };
    }

    client.request({
        url: `/api/v2/tickets/${ticketID}`,
        type: "PUT",
        contentType: "application/json",
        data: JSON.stringify(payload)
    }).then(response => {

    }).catch(error => {
        console.error('There was a problem with the request:', error);
        throw error;
    });

}


function addTag(ticketID, unit, time) {


    return client.request({
        url: `/api/v2/tickets/${ticketID}/tags`,
        type: "PUT",
        contentType: "application/json",
        data: JSON.stringify({
            "tags": ["ticket_snoozed_for" + "_" + time + "_" + unit]
        })
    }).then(response => {


    }).catch(error => {
        // Handle errors here
        console.error('failed to update ticket', error);
    });

}



function removeTag(ticketID, unit, time) {



    return client.request({
        url: `/api/v2/tickets/${ticketID}/tags`,
        type: "DELETE",
        contentType: "application/json",
        data: JSON.stringify({
            "tags": ["ticket_snoozed_for" + "_" + time + "_" + unit]
        })
    }).then(response => {

    }).catch(error => {
        // Handle errors here
        console.error('failed to update ticket', error);
    });

}

function isTimerRunning(ticket, domainName) {
    var payload = {
        payload: {
            "Key": {
                "id": domainName,
                "ticket": ticket
            }
        }
    };

    return client.request({
        url: 'https://sgqnegab5f.execute-api.us-east-1.amazonaws.com/snoozeAPP/getTimerStatus',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(payload)
    }).then(response => {

        // Check the status code and body to determine the result
        if (response.statusCode === 404) {
            return false;
        } else if (response.statusCode === 200) {
            // Parse the body to get the status or handle it as needed
            const responseBody = JSON.parse(response.body);
            const timerStatus = responseBody.status;

            if (timerStatus === 'running') {
                return true;
            } else {
                return false;
            }
        }
    }).catch(error => {
        // Handle other errors
        console.error(error);
        return true;
    });
}

function isAppAdmin(domainName, userID) {
    var id = domainName + "_" + userID;
    var payload = {
        payload: {
            "Key": {
                "appName": "Snooze-APP",
                "sk": id
            }
        }
    };


    return client.request({
        url: 'https://m0nskfyta8.execute-api.us-east-1.amazonaws.com/config/isAdmin',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(payload)
    }).then(response => {
        const responseBody = JSON.parse(response.body);
        if (response.statusCode === 200) {
            return responseBody.isAdmin;
        } else {
            return false; // Return false if not an app admin
        }
    }).catch(error => {
        console.error('Error checking if user is app admin:', error);
        throw error;
    });
}


function getAuthClient() {
    const payload = {
        payload: {
            "Key": {
                "subdomain": subdomain
            }
        }
    };

    // Make the POST request to the API
    return client.request({
        url: 'https://sgqnegab5f.execute-api.us-east-1.amazonaws.com/snoozeAPP/getOAuthClient',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(payload)
    }).then(response => {
        const responseBody = JSON.parse(response.body);

        if (response.statusCode === 200) {
            const {

                clientId,
                clientSecret,
                token
            } = responseBody;

            return {

                clientId,
                clientSecret,
                token
            };
        }
    }).catch(error => {
        // Handle errors
        console.error('Error fetching auth token:', error);
        throw error;
    });
}

function isClientAuthorized() {
    var id = subdomain;
    var payload = {
        payload: {
            "Key": {
                "id": id
            }
        }
    };

    return client.request({
        url: 'https://m0nskfyta8.execute-api.us-east-1.amazonaws.com/config/isGlobalAuthorized',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(payload)
    }).then(response => {
        const responseBody = JSON.parse(response.body);

        // Return both authorized status and accessToken
        return {
            authorized: responseBody.authorized,
            accessToken: responseBody.accessToken || null // Default to null if accessToken is undefined
        };
    }).catch(error => {
        console.error('Error checking if user is app admin:', error);
        throw error;
    });
}


// Helper function
function convertToSeconds(value, unit) {
    value = parseInt(value, 10) || 0;
    switch (unit) {
        case "minutes":
            return value * 60;
        case "hours":
            return value * 3600;
        case "seconds":
        default:
            return value;
    }
}

function getSettings() {
    const payload = {
        payload: {
            Key: {
                id: subdomain
            }
        }
    };

    return client.request({
        url: 'https://sgqnegab5f.execute-api.us-east-1.amazonaws.com/snoozeAPP/getSettings',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(payload)
    }).then(response => {
        const responseBody = JSON.parse(response.body);

        if (response.statusCode === 200) {
            // Extract all fields from the response
            const { triggerId, isChecked, snoozefieldId, isSnoozefieldChecked } = responseBody;

            return {
                triggerId: triggerId || null,
                isChecked: isChecked || false,
                snoozefieldId: snoozefieldId || null,
                isSnoozefieldChecked: isSnoozefieldChecked || false
            };
        } else {
            console.error('Error:', responseBody.msg);
            throw new Error(responseBody.msg);
        }
    }).catch(error => {
        console.error('Error getting settings:', error);
        throw error;
    });
}
