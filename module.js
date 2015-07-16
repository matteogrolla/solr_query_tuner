angular.module('app', ['ngRoute']);
/*angular.module('app').config(['$controllerProvider', function($controllerProvider) {
  $controllerProvider.allowGlobals();
}]);*/

var app = angular.module('app');

app.config(function($routeProvider, $locationProvider){
  $routeProvider
  .when("/", {
    redirectTo: "/queries"
  })
  .when("/queries", {
    controller: "QueriesController",
    templateUrl: "views/queries/list.html"
  })
  .when("/queries/:id", {
    controller: "QueryController",
    templateUrl: "views/queries/edit.html"
  });

  $locationProvider.html5Mode(true);
});

//Services
app.factory('Query', function(filterFilter){

  var queries = [
    //, targetRanks:[1, 3, NaN]
    {id:0, userQuery: "*:*", targetDocs: ["adata", "asus", "belkin"], score:10},  
    {id: 1, userQuery: "*:*", targetDocs: ["apple", "belkin", "dell"], targetRanks:[2, 5, NaN], score:15},
    {id: 2, userQuery: "*:*", targetDocs: ["asus", "dell", "samsung"], targetRanks: [3, 8, NaN], score:20}
  ];

  var seq = 3;

  return {
    query: function(params){
      return filterFilter(queries, params);
    },
    get: function(params){
      return this.query(params)[0];
    },
    put: function(id, query){
      queries[id] = query;
    },
    delete: function(id){
      queries.splice(id,1);
    },
    add: function(){
      var query = {id: seq++}
      queries.push(query);
      return query;
    }
  };
});

app.factory('metricsService', function(solrService){
  return {
    defaultRank: 100,
    allTargetRanks: function(queries, k){
      for(var i=0; i<queries.length; i++){
        this.targetRanks(queries[i], k);
      }
    },
    targetRanks: function(query, k){
      solrService.search(query.userQuery, k).then(
        function(response){
          var ids2Rank = {};
          var docs = response.response.docs;
          for (var i=0; i<docs.length; i++){
            var id = docs[i].id;
            ids2Rank[id] = i+1;
          }
          var targetDocs = query.targetDocs;
          var targetRanks = [];
          for (var i=0; i<targetDocs.length; i++){
            var id = targetDocs[i];
            var rank = NaN;
            if (ids2Rank[id]){
              rank = ids2Rank[id];
            }
            targetRanks.push(rank);
          }
          query.targetRanks = targetRanks;
        });
    },
    precisionAt: function(query, k){
      var targetRanks = query.targetRanks;
      var precision=0.0;
      for (var i=0; i<targetRanks.length; i++){
        var rank = targetRanks[i];
        if (rank<=k){
          precision++;
        }
      }
      precision = precision/k;
      query["precisionAt"] = precision;
    },
    meanPrecisionAt: function(queries, k){
      var meanPrecisionAt = 0.0;
      for (var i=0; i<queries.length; i++){
        var query = queries[i];
        this.precisionAt(query, k);
        meanPrecisionAt += query["precisionAt"];
      }
      meanPrecisionAt /= queries.length;
      return meanPrecisionAt;
    },
    reciprocalRankAt: function(query, k){
      var targetRanks = query.targetRanks;    
      var lowestRank = this.defaultRank;
      for (var i=0; i<targetRanks.length; i++){
        var rank = targetRanks[i];
        if (rank < lowestRank){
          lowestRank = rank;
        }
      }
      query["reciprocalRankAt"] = 1/lowestRank;
    },
    meanReciprocalRankAt: function(queries, k){
      var meanReciprocalRankAt = 0.0;
      for (var i=0; i<queries.length; i++){
        var query = queries[i];
        this.reciprocalRankAt(query, k);
        var reciprocalRankAt = query["reciprocalRankAt"];
        meanReciprocalRankAt += reciprocalRankAt;
      }
      return meanReciprocalRankAt / queries.length;
    }
  }
});

app.value('collection-url', 'http://localhost:8080');

app.factory('solrService', function($q, $http){
  return {
    search: function(query, rows){
      return $http.get('solr/query?q='+query+'&rows='+rows)
        .then(
          function(response){
            return response.data;
          }, function(errResponse){
            return $q.reject(errResponse.status + " " +errResponse.data.error.msg);
          });
    }
  }
});

app.controller('QueriesController', function ($scope, Query, metricsService, solrService, $location){
  var queries = Query.query();
  $scope.queries = queries;

  metricsService.allTargetRanks(queries,5);
  /*
    Problema: le seguenti 2 chiamate dovrebbero essere eseguite solo dopo che 
    la precedente chiamata asincrona è stata terminata
  */
  var meanPrecisionAt = metricsService.meanPrecisionAt(queries,5);
  var meanReciprocalRankAt = metricsService.meanReciprocalRankAt(queries, 5);
  //metricsService.precisionAt(queries[1],5);
  solrService.search('*:*',3).then(
    function(docs){
      //$scope.docs = docs;
    }, function(err){
      $scope.docs = err;
    });

  $scope.meanPrecisionAt = meanPrecisionAt;  
  $scope.meanReciprocalRankAt = meanReciprocalRankAt;

  $scope.deleteRow = function(id){
    Query.delete(id);
    $scope.queries = Query.query();
  };

  $scope.addRow = function(){
    var query = Query.add();
    $location.path("/queries/"+query.id);
  }
});

app.controller('QueryController', function ($scope, Query, $routeParams, $location){
  $scope.query = Query.get({id: $routeParams.id});
  var i=0;
  $scope.save = function(query){    
    var strToStrArray = function(str){
      if (Array.isArray(str)){
        return str;
      }
      return str.split(',');
    };
    var strToIntArray = function(str){
      if (Array.isArray(str)){
        return str;
      }
      return str.split(',').map(function(item) {
          return parseInt(item, 10);
        });
    };

    var id = query.id;
    query.targetDocs = strToStrArray(query.targetDocs);
    //query.targetRanks = strToIntArray(query.targetRanks);    
    Query.put(id,query);
    $location.path("/queries");
  }
});
