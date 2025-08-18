var client = ZAFClient.init();
client.invoke('resize', {
    height: '430px'
});

let isLoading = false;

const usersContainer = document.getElementById("appUsers");
var appId, userId, subdomain, currentUser, rolen, statusID;;
var settingsTabLoader = document.getElementById('settingsTabLoader');
var checkbox = document.getElementById("emailsettings");
var checkbox2 = document.getElementById("toggleSnoozeField");
var authToken,clientID,clientSecret;
var snoozeFieldId = null; 
var triggerId = null;
const grantAll = document.getElementById('grantAll');
const revokeAllBtn =  document.getElementById('revokeAccess');
function filterUsers(searchTerm) {
    const rows = document.querySelectorAll("#appUsers table tr");

    rows.forEach(row => {
        const name = row.cells[0].textContent.toLowerCase();
        if (name.includes(searchTerm)) {
            row.style.display = "table-row";
        } else {
            row.style.display = "none";
        }
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


document.addEventListener("DOMContentLoaded", function() {
    client.metadata().then(function(metadata) {
        statusID = metadata.settings.statusId;
    });

    client.get('currentUser').then(function(data) {
        currentUser = data.currentUser.id;
        role = data.currentUser.role;
        userId = data.currentUser.id;

        client.context().then(function(context) {
            subdomain = context.account.subdomain;


            searchInput.addEventListener("input", function() {
                const searchTerm = searchInput.value.toLowerCase().trim();
                filterUsers(searchTerm);
            });



         getSettings().then(settings => {
        if (settings) {
            // Set trigger checkbox
            checkbox.checked = settings.isChecked;

            // Set snooze field checkbox
            checkbox2.checked = settings.isSnoozefieldChecked;
            triggerId = settings.triggerId;
            // Store snoozeFieldId globally if needed
            snoozeFieldId = settings.snoozefieldId;
        }
    }).catch(error => {
        console.error("Error getting settings:", error);
    });
			
			  settingsTabLoader.style.display = 'block';
		   usersContainer.innerHTML = '';
            displayUsers();
			
			   


			
        });
		
    });
});


  grantAll.addEventListener('click', async function(event) {
  grantAll.disabled = true;
    const originalText = grantAll.textContent;
    grantAll.textContent = 'Processing...';

    try {
        const users = await getUsers();
        for (const user of users) {
            if (user.role !== 'admin') {
                await addAdmin(subdomain, user.name, user.email, user.id);
            }
        }
		    client.invoke('notify', 'Admin access successfully granted', 'notice', {
        duration: 10000});
    } catch (error) {
        console.error('Error while granting access:', error);
    } finally {
        grantAll.disabled = false;
        grantAll.textContent = originalText;
    }
  });
  
  
  revokeAllBtn.addEventListener('click', async function(event) {
	  
	   revokeAllBtn.disabled = true;
    const originalText = revokeAllBtn.textContent;
    revokeAllBtn.textContent = 'Processing...';

    try {
        const users = await getUsers();
        for (const user of users) {
            if (user.role !== 'admin') {
                await removeAdmin(subdomain, user.id);
            }
        }
		client.invoke('notify', 'Admin access successfully removed', 'notice', {
        duration: 10000});
    } catch (error) {
        console.error('Error while granting access:', error);
    } finally {
        revokeAllBtn.disabled = false;
        revokeAllBtn.textContent = originalText;
    }
  });
  
  
  
  
  
  

function handleCheckboxChange(checkbox) {
    const isChecked = checkbox.checked;

    if (isChecked) {
        createTrigger().then(triggerId => {
            saveSettings({
                subdomain: subdomain,
                triggerId: triggerId,
                isChecked: true
            });
        }).catch(error => {
            console.error("Error creating trigger:", error);
        });
    } else {
		if(triggerId){
       
                deleteTrigger(triggerId);
                saveSettings({
                    subdomain: subdomain,
                    triggerId: triggerId,
                    isChecked: false
                });
            
       
    }
	}
}


function handleToggleSnoozeField(checkbox) {
    if (checkbox.checked) {
        createSnoozeField().then(fieldId => {
            saveSettings({
                subdomain: subdomain,
                snoozefieldId: fieldId,
                isSnoozefieldChecked: true
            });
        }).catch(error => {
            console.error("Error creating snooze field:", error);
        });
    } else {
        deleteSnoozeField().then(() => {
            saveSettings({
                subdomain: subdomain,
                snoozefieldId: snoozeFieldId,
                isSnoozefieldChecked: false
            });
        }).catch(error => {
            console.error("Error deleting snooze field:", error);
        });
    }
}


function createSnoozeField() {
    return client.request({
        url: '/api/v2/ticket_fields.json',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            ticket_field: {
                type: 'text',
                title: 'Total Snoozed Time',
                key: 'total_snoozed_time',
                description: 'Displays the total time a ticket has been snoozed',
                required: false
            }
        })
    }).then(function(response) {
        snoozeFieldId = response.ticket_field.id;
        console.log('Field created:', response.ticket_field);
        return snoozeFieldId; // return the ID for saving
    }).catch(function(error) {
        console.error('Error creating ticket field:', error);
        throw error; // propagate error
    });
}

function deleteSnoozeField() {
    if (!snoozeFieldId) {
        return Promise.resolve(); // nothing to delete
    }

    return client.request({
        url: `/api/v2/ticket_fields/${snoozeFieldId}.json`,
        type: 'DELETE'
    }).then(function() {
        console.log('Field deleted:', snoozeFieldId);
        snoozeFieldId = null;
    }).catch(function(error) {
        console.error('Error deleting ticket field:', error);
        throw error; // propagate error
    });
}



	


function makeReadonly(id) {

    document.getElementById(id).setAttribute('readonly', true);
    document.getElementById(id).style.backgroundColor = '#e9ebed';

}
function makeEditable(id) {

    document.getElementById(id).removeAttribute('readonly');
    document.getElementById(id).style.backgroundColor = '#fff';

}


function renderAuthorizationPage(clientId) {

    const url = `https://${subdomain}.zendesk.com/oauth/authorizations/new?response_type=code&redirect_uri=https://sgqnegab5f.execute-api.us-east-1.amazonaws.com/snoozeAPP/getAuthorizationCode?subdomain=${subdomain}&client_id=${clientId}&scope=read%20write`;

    // Create the Basic Authentication token

    client.invoke('instances.create', {
        location: 'modal',
        url: url,
        size: {
            width: '500px',
            height: '400px'
        }
    }).then(function(modalContext) {});

}


function addOAuthClient(clientId, clientSecret) {


    const payload = {
        payload: {
            Item: {
                subdomain: subdomain,
                clientId: clientId,
                clientSecret: clientSecret,
                token: ''
            }
        }
    };


    return client.request({
        url: 'https://sgqnegab5f.execute-api.us-east-1.amazonaws.com/snoozeAPP/addOAuthClient',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(payload)
    }).then(response => {}).catch(error => {
        // Handle errors
        console.error('Error fetching auth token:', error);
        throw error;
    });


}
async function displayUsers() {
    try {

        const users = await getUsers();
        allUsers = users;

        displayUsersTable(allUsers);

      

    } catch (error) {
        console.error('Error displaying subjects:', error);
    }
}



async function displayUsersTable(users) {
    const table = document.createElement('table');
    const headerRow = table.insertRow();
    const headers = ['Name', 'Email', 'Role', ''];

    headers.forEach(headerText => {
        const header = document.createElement('th');
        header.textContent = headerText;
        headerRow.appendChild(header);
    });

    const isAdminPromises = [];

    users.forEach(user => {
        // Check if the user's role is not "admin"
        if (user.role !== 'admin') {
            const row = table.insertRow();
            let actionLinkText = '';
            // Push the promise for each isAdmin call to the array
            isAdminPromises.push(isAppAdmin(subdomain, user.id).then(isAdmin => {
                if (isAdmin) {
                    actionLinkText = 'Revoke Admin Access';
                } else {
                    actionLinkText = 'Grant App Admin Access';
                }
                const actionFunctionName = isAdmin ? 'revokeAccess' : 'grantAccess';
                const rowData = [
                    user.name,
                    user.email,
                    user.role,
                    // Create a link for the last column
                    `<a href="#" onclick="${actionFunctionName}('${user.id}', '${user.email}','${user.name}')">${actionLinkText}</a>`
                ];
                rowData.forEach(cellData => {
                    const cell = row.insertCell();
                    // If the cell data is an HTML string, set it as innerHTML
                    if (typeof cellData === 'string') {
                        cell.innerHTML = cellData;
                    } else {
                        cell.textContent = cellData;
                    }
                });
            }));
        }
    });

    // Wait for all isAdmin promises to resolve
    await Promise.all(isAdminPromises);

    usersContainer.innerHTML = '';
    usersContainer.appendChild(table);
settingsTabLoader.style.display = 'none';
    document.getElementById('settingsDiv').style.display = 'block';}
	


function getUsers(url = '/api/v2/search.json?query=type:user -role:end-user', allUsers = []) {
    return client.request({
        url: url,
        type: "GET",
        contentType: "application/json"
    }).then(response => {
        // Filter users by role
        // const filteredUsers = response.users.filter(user => user.role === 'agent' || user.role === 'admin');

        allUsers.push(...response.results);

        // If there's a next page, recursively fetch it
        if (response.next_page) {
            return getUsers(response.next_page, allUsers);
        } else {
            // All pages fetched, rese dropdown
            return allUsers;
        }
    }).catch(error => {

        console.error('There was a problem with the request:', error);
        // You might want to handle the error here or propagate it further
        throw error;
    });
}



function revokeAccess(id, email, name) {


    // Find the parent row of the clicked link
    const row = event.target.closest('tr');

    // Find the last cell (containing the link)
    const lastCell = row.cells[row.cells.length - 1];

    // Change the text of the link back to "Grant App Admin Access"
    lastCell.innerHTML = `<a href="#" onclick="grantAccess('${id}', '${email}','${name}')">Grant App Admin Access</a>`;

    // Add any additional logic here, such as updating UI or making API calls
    removeAdmin(subdomain, id); // You need to define removeAdmin function accordingly
    client.invoke('notify', 'Admin access successfully removed from' + ' ' + name, 'notice', {
        duration: 10000
    });
}

function grantAccess(id, email, name) {


    // Find the parent row of the clicked link
    const row = event.target.closest('tr');

    // Find the last cell (containing the link)
    const lastCell = row.cells[row.cells.length - 1];

    // Change the text of the link to "Revoke Admin Access"
    lastCell.innerHTML = `<a href="#" onclick="revokeAccess('${id}', '${email}','${name}')">Revoke Admin Access</a>`;


    client.invoke('notify', 'Admin access successfully added to' + ' ' + name, 'notice', {
        duration: 10000
    });

    addAdmin(subdomain, name, email, id);
}

function addAdmin(domainName, name, email, userID) {
    var id = domainName + "_" + userID;

var payload = {
        payload: {
            Item: {

                "appName": "Snooze-APP",
                "sk": id,
                "name": name,
                "email": email,
                "userId": userID,
                "isAdmin": true

            }
        }
    };


    return client.request({
        url: 'https://m0nskfyta8.execute-api.us-east-1.amazonaws.com/config/addAdmin',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(payload)
    }).then(response => {
        const responseBody = JSON.parse(response.body);
    }).catch(error => {
        // Handle errors
        console.error(error);
    });




}


function removeAdmin(domainName, userID) {
    var id = domainName + "_" + userID;

   var payload = {
        payload: {
            "Key": {
                "appName": "Snooze-APP",
                "sk": id
            }

        }
    };;

    return client.request({
        url: 'https://m0nskfyta8.execute-api.us-east-1.amazonaws.com/config/revokeAccess',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(payload)
    }).then(response => {

        const responseBody = JSON.parse(response.body);

    }).catch(error => {
        console.error('Error fetching subjects:', error);
        throw error;
    });
}


function createTrigger() {

    return client.request({
        url: `/api/v2/triggers`,
        type: "POST",
        contentType: "application/json",
        data: `{
    "trigger": {
			 "actions": [
      {
        "field": "notification_user",
           "value": [
                    "assignee_id",
                    "Snooze APP",

                    "The Snooze Timer has finished and the ticket {{ticket.id}} is currently  open  and needs your support"
                ]
      }
    ],
        "conditions": {

      "all": [
                {
                    "field": "update_type",
                    "operator": "is",
                    "value": "Change"
                },
                {
                    "field": "custom_status_id",
                    "operator": "value_previous",
                    "value": "${statusID}"
                },
                {
                    "field": "status",
                    "operator": "value",
                    "value": "open"
                }
            ]
            
	 	
	 	
	 	
	 	
	 },
	
			      "title": "Snooze Ticket Email Notification"

	
	
	
	 
   
    }
  }`
    }).then(response => {

        return response.trigger.id;
    }).catch(error => {
        // console.error('There was a problem with the request:', error);
    });



}



function deleteTrigger(triggerId) {

    const options = {
        url: `/api/v2/triggers/${triggerId}`,
        type: 'DELETE',
        cors: false,
    };

    return client.request(options)
        .then((response) => {})
        .catch((error) => {
            //console.error("Failed to DELETE TOKEN:", error);
            return null;
        });


}

function saveSettings({ subdomain, triggerId, isChecked, snoozefieldId, isSnoozefieldChecked }) {
    var payload = {
        payload: {
            Item: {
                id: subdomain
            }
        }
    };

    if (triggerId !== undefined) {
        payload.payload.Item.trigger_id = triggerId;
    }
    if (isChecked !== undefined) {
        payload.payload.Item.isChecked = isChecked;
    }
    if (snoozefieldId !== undefined) {
        payload.payload.Item.snoozefieldId = snoozefieldId;
    }
    if (isSnoozefieldChecked !== undefined) {
        payload.payload.Item.isSnoozefieldChecked = isSnoozefieldChecked;
    }

    return client.request({
        url: 'https://sgqnegab5f.execute-api.us-east-1.amazonaws.com/snoozeAPP/saveSettings',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(payload)
    }).then(response => {	
        client.invoke('notify', "Successfully saved", 'notify');
    }).catch(error => {
        console.error(error);
    });
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