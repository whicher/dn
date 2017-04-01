var _RAW_QUERY = '';

$( document ).ready(function() {
    console.log( "ready!" );
    var currentUrl = window.location.href;

    firebase.auth().onAuthStateChanged(function(user) {
      if (user) {
        // User is signed in.
        var isAnonymous = user.isAnonymous;
        var uid = user.uid;
        // console.log('signInAnonymously: ' + JSON.stringify(user));
        console.log('signed in as ' + user.displayName);
        updateUiWithLogin();
        if (!isAnonymous) {
          createProfileInfo();
          // If not anonim and trying to go to login page, redirect to profile.
          if(currentUrl.indexOf('/login') > 0) {
            console.log('Already logged in, no need to go to login page');
            window.location = '/profile';
          }
        }
      } else {
        console.log('signed out');
        updateUiWithLogin();
        if(currentUrl.indexOf('/profile') > 0) {
          console.log('Logged out, cant go to profile page, redirect to login');
          window.location = '/login';
        }
      }
    });

    $('#span-num-search-results').text('0');

    $('#btn-logout').click(function(args){
      console.log('Logging out');
      firebase.auth().signOut();
      updateUiWithLogin();
    });

    // URL handling.
    if(currentUrl.indexOf('/details?id=') > 0) {
      console.log('DETAILS PAGE');
      $('#div-job-details').append('<h1>Discuss</h1>');
      var params = getJsonFromUrl(currentUrl);
      // var jobKey = params.id.substr(params.job.lastIndexOf('_') + 1);
      var jobKey = params.id;
      console.log('param: ' + jobKey);

      var ref = firebase.database().ref('posts/' + jobKey);
      var job = {};
      ref.once('value', function(snapshot) {
        // snapshot.forEach(function(childSnapshot) {
        //   var childKey = childSnapshot.key;
        //   var childData = childSnapshot.val();
        //   // console.log('childKey: ' + JSON.stringify(childKey));
        //   // console.log('childData: ' + JSON.stringify(childData));
        //   job = childData;
        // });
        updateUIDetails(JSON.parse(JSON.stringify(snapshot)));
      });

    } else if(
        currentUrl.indexOf('/search?q=') > 0 ||
        currentUrl.indexOf('/search?search_query=') > 0) {
      console.log('SEARCH BY GET');
      var params = getJsonFromUrl(currentUrl);
      var query = '';
      if (params.hasOwnProperty('q')) {
        query = params.q.toLowerCase();
      } else {
        query = params.search_query.toLowerCase();
      }

      console.log('param: ' + query);
      $('#input-query').val(query);
      DoSearch();
    } else if(currentUrl.indexOf('/profile') > 0) {
      console.log('PROFILE PAGE');
      var user = firebase.auth().currentUser;
      console.log('current user: ' + JSON.stringify(user));
      if (user == null) {
        //window.location = '/login';
      } else {
        // updateUiWithLogin();
        // createProfileInfo();
      }
    } else {
      console.log('HOMEPAGE');
      populateNews();

      $('#div-search-results').hide();

      $('#form-search').submit(function(e) {
        e.preventDefault();
        DoSearch();
      });

      $('#btn-login').click(function(args){
        console.log('Logging in');
        var email = $('#input-email').val();
        var password = $('#input-password').val();
        console.log('Creds: ' + email + ' ' + password);
        // TODO(hakanu): Firebase login here.
      });

      $('#btn-signup').click(function(args){
        console.log('Signing up');
        var email = $('#input-signup-email').val();
        var password = $('#input-signup-password').val();
        var name = $('#input-signup-name').val();
        var background = $('#input-signup-background').val();
        var uni = $('#input-signup-uni').val();
        var uniDept = $('#input-signup-uni-dept').val();
        console.log('Creds: ' + email + ' ' + password + ' ' + background + '' + 
                    name + ' ' + uni + ' ' + uniDept);
        // TODO(hakanu): Firebase sign up here.
      });

      $('#btn-google-signin').click(function(args){
        console.log('Signing in with Google');
        var provider = new firebase.auth.GoogleAuthProvider();
        provider.addScope('https://www.googleapis.com/auth/plus.login');
        firebase.auth().signInWithPopup(provider).then(function(result) {
          // This gives you a Google Access Token. You can use it to access the Google API.
          var token = result.credential.accessToken;
          // The signed-in user info.
          var user = result.user;
          console.log('user: ' + JSON.stringify(user));
          updateUiWithLogin();
          //window.location = '/';
          navigateToProfileIfLoggedIn();
        }).catch(function(error) {
          // Handle Errors here.
          var errorCode = error.code;
          var errorMessage = error.message;
          // The email of the user's account used.
          var email = error.email;
          // The firebase.auth.AuthCredential type that was used.
          var credential = error.credential;
          console.log('Error: ' + JSON.stringify(error));
        });
      });

      $('#btn-facebook-signin').click(function(args){
        console.log('Signing in with facebook');
        var provider = new firebase.auth.FacebookAuthProvider();
        provider.setCustomParameters({
          'display': 'popup'
        });
        firebase.auth().signInWithPopup(provider).then(function(result) {
          // This gives you a Google Access Token. You can use it to access the Google API.
          var token = result.credential.accessToken;
          // The signed-in user info.
          var user = result.user;
          console.log('user: ' + JSON.stringify(user));
          updateUiWithLogin();
          //window.location = '/';
          navigateToProfileIfLoggedIn();
        }).catch(function(error) {
          // Handle Errors here.
          var errorCode = error.code;
          var errorMessage = error.message;
          // The email of the user's account used.
          var email = error.email;
          // The firebase.auth.AuthCredential type that was used.
          var credential = error.credential;
          console.log('Error: ' + JSON.stringify(error));
        });
      });
    }
});

function populateNews() {
  console.log('populating news');
  var user = firebase.auth().currentUser;
  console.log('Querying as user: ' + user);
  if (user == null) {
    console.log('user is null so signing in anonymously for news');
    firebase.auth().signInAnonymously().catch(function(error) {
      // Handle Errors here.
      var errorCode = error.code;
      var errorMessage = error.message;
      console.log('Error: ' + errorCode + ' msg: ' + errorMessage);
    });
  }

  var ref = firebase.database().ref('posts/').orderByKey().limitToLast(50);
  ref.once('value', function(snapshot) {
    snapshot.forEach(function(childSnapshot) {
      var childKey = childSnapshot.key;
      var childData = childSnapshot.val();
      // console.log('childKey: ' + JSON.stringify(childKey));
      // console.log('childData: ' + JSON.stringify(childData));
      //jobKeys.push(childData);
      appendPostToNews(childData);
    });
    //GetJobs(jobKeys);
  });
}

function appendPostToNews(post) {
  // console.log('Appending post to news');
  $('#ul-news').append(
      '<li>' + 
        '<p><b><a href="/details?id=' + post._id.oid + '" target="_blank">' + post.title + '</a></b></p>' +
        '<p><sup>' + post.dt_create.date + ' | ' + post.domain + ' | ' +
          '<a href=/details?id=' + post._id.oid + '" target="_blank">Comment</a></sup>' +
      '</li>');
}

function DoSearch() {
  console.log('Doing search...');
  console.log('Cleaning up previous search');
  $('#ul-search-results').children().remove();
  var originalQuery = $('#input-query').val();
  _RAW_QUERY = originalQuery.toLowerCase();

  // Check if user is logged in.
  // If not, do an anonymous login otherwise no permission.
  var user = firebase.auth().currentUser;
  console.log('Querying as user: ' + user);
  if (user == null) {
    console.log('user is null so signing in anonymously');
    firebase.auth().signInAnonymously().catch(function(error) {
      // Handle Errors here.
      var errorCode = error.code;
      var errorMessage = error.message;
      console.log('Error: ' + errorCode + ' msg: ' + errorMessage);
    });
  }

  GetJobKeys(_RAW_QUERY);
  
  // Log the query for analysis.
  if (firebase.auth().currentUser != null) {
    logQuery(firebase.auth().currentUser.uid, _RAW_QUERY, originalQuery);
  } else {
    console.log('Can not log bc not logged in');
  }
}

function getTodayDate() {
    var d = new Date();
    var currentYear = d.getFullYear().toString();
    var currentMonth = (
        d.getMonth() + 1 >= 10 ? d.getMonth() + 1 : '0' + (d.getMonth() + 1));
    var currentDay = d.getDate() >= 10 ? d.getDate() : '0' + (d.getDate());
    console.log(currentYear + '-' + currentMonth + '-' + currentDay);
    return currentYear + '-' + currentMonth + '-' + currentDay;
}

function logQuery(uid, query, originalQuery) {
  var d = getTodayDate();
  var newLogKey = firebase.database().ref().child('logs/' + d).push({
      'uid': uid,
      'query': query,
      'rawQuery': originalQuery,
      'date': getTodayDate(),
      'medium': 'web',
  }).key;
  console.log('Pushed log key: ' + newLogKey);
  //return firebase.database().ref().update(updates);
}

function getJsonFromUrl() {
  var query = location.search.substr(1);
  var result = {};
  query.split("&").forEach(function(part) {
    var item = part.split("=");
    result[item[0]] = decodeURIComponent(item[1]);
  });
  return result;
}

function GetJobKeys(query) {
  console.log('GetJobKeys ' + query);
  var jobKeys = [];
  var ref = firebase.database().ref('datasets_index/' + query).orderByValue().limitToFirst(20);
  ref.once('value', function(snapshot) {
    snapshot.forEach(function(childSnapshot) {
      var childKey = childSnapshot.key;
      var childData = childSnapshot.val();
      // console.log('childKey: ' + JSON.stringify(childKey));
      // console.log('childData: ' + JSON.stringify(childData));
      jobKeys.push(childData);
    });
    GetJobs(jobKeys);
  });
}

function GetJobs(jobKeys) {
  console.log('GetJobs ' + jobKeys.length);
  var jobs = [];
  for (var i = jobKeys.length - 1; i >= 0; i--) {
    var key = jobKeys[i];
    var ref = firebase.database().ref('datasets/' + key);
    ref.once('value', function(snapshot) {
      // No need to do the foreach because it's already one single object.
      // If you do this for each it iterates over the object keys. Unnecessary
      // looping.
      jobs.push(JSON.parse(JSON.stringify(snapshot)));
      updateUI(jobs);
    });
  }
}

function updateUI(jobs) {
  console.log('updateUI');
  $('#h3-search-query').text(_RAW_QUERY);
  $('#span-num-search-results').text(jobs.length);
  for (var i = jobs.length - 1; i >= 0; i--) {
    if ($('#li-job-' + jobs[i].hash).length < 1) {
      $('#ul-search-results').append(
          '<li id="li-job-' + jobs[i].domain +'">' +
          '<h4><a href="/dataset?id=' + jobs[i]._id.oid + '" target="_blank">' + jobs[i].title + '</a></h4>' + 
          '<sub>' + jobs[i].dt_create.date + ' | ' + JSON.stringify(jobs[i].meta) + ' | ' + '</sub>' + 
          '</li>');
    }
  }
  $('#div-search-results').show();
}

function navigateToProfileIfLoggedIn() {
  console.log('navigateToProfileIfLoggedIn');
  var user = firebase.auth().currentUser;
  if (user) {
    console.log('Logged in so going to profile');
    // window.location = '/profile';
  } else {
    console.log('Not logged in');
  }
}

function updateUiWithLogin() {
  console.log('updating UI');
  var user = firebase.auth().currentUser;
  if (user && !user.isAnonymous) {
    console.log('Logged in');
    $('#a-signin').text(user.displayName);
    $('#a-signin').attr('href', '/profile');
    $('#btn-logout').text('Log out');
  } else {
    console.log('Not logged in');
    $('#a-signin').text('Log in/Sign up');
    $('#a-signin').attr('href', '/login');
    $('#btn-logout').text('');
  }
}


// function updateUiAfterLogout() {
//   $('#btn-logout').addClass('hidden');
//   $('#btn-login').removeClass('hidden');
//   $('#p-login-username').html('Not logged in');
//   $('#ul-urls').html('');
//   $('#p-message').text('Log in first');
// }

// /profile page.
function createProfileInfo() {
  console.log('createProfileInfo');
  var user = firebase.auth().currentUser;
  if (user) {
    console.log('Logged in');
    $('#div-profile').append(
        '<h2>' + user.displayName + '</h2>' +
        '<p><img src="' + user.photoURL + '"></p>' +
        '<p>-</p>' +
        '<br>'
    );
  } else {
    console.log('Not logged in');
    $('#a-signin').text('Kaydol/Oturum Aç');
  }
}

function updateUIDetails(post) {
  console.log('updateUIDetails ');
  console.log(JSON.stringify(post));
  $('#div-post-details').append('<h2>' + post.title + '</h2>');
  $('#div-post-details').append('<ul>');
  $('#div-post-details').append('<li>At: <b>' + post.dt_create.date + '</b></li>');
  $('#div-post-details').append('<li>Score: <b>' + post.score + '</b></li>');
  $('#div-post-details').append('<li>Ups: <b>' + Object.keys(post.actions.votes.users_upvote).length + '</b></li>');
  // $('#div-post-details').append('<li>Downs: <b>' + post.actions.votes.users_downvote.length + '</b></li>');
  $('#div-post-details').append('<li><b>' + post.categories[0] + '</b></li>');
  $('#div-post-details').append('<li><div>' + post.body + '</div></b></li>');
  $('#div-post-details').append('<li>By <a href="/profile?u="' + post.owner.oid + '" target="_blank">' + post.author + '</a></b></li>');
  $('#div-post-details').append('</ul>');
  $('#div-post-details').append('<p><a class="btn btn-lg btn-primary btn-block" href="' + post.url + '" target="_blank">Read more</a></h2>');
}