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
    templateUrl: "views/queries/show.html"
  });

  $locationProvider.html5Mode(true);
});

//Services
app.factory('Query', function(filterFilter){

  var queries = [
    {id:1, userQuery: "regolamento condominiale", targetDocs: ["100", "101", "103"], score:10},
    {id: 2, userQuery: "immigrazione", targetDocs: ["200", "201", "203"], score:15},
    {id: 3, userQuery: "quote rosa", targetDocs: ["300", "301", "303"], score:20}
  ];

  return {
    query: function(params){
      return filterFilter(queries, params);
    },
    get: function(params){
      return this.query(params)[0];
    }
  };
});

app.controller('MessageController', function ($scope) {
  $scope.message = "This is a model.";
});

app.controller('QueriesController', function ($scope, Query){
  $scope.queries = Query.query();
});

app.controller('QueryController', function ($scope, Query, $routeParams){
  $scope.query = Query.get({id: $routeParams.id});
  var i=0;
});
