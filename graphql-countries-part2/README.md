# GraphQL Countries Part 2

This part is a continuation of [graphql-countries-part1](https://github.com/luisw19/graphql-samples/tree/master/graphql-countries-part1).
In this part we'll refactor the code to separate concerns by keeping server.js light and reference the Graph schema and resolvers from
different files. In this sample, we'll also implement node-fetch to use the [REST Countries API](https://github.com/apilayer/restcountries)
as a backend data source.

Following a step by step guide on how to do this:

#### 1) Create a folder named **/resources** and within it, add two files: **types.js** and **resolvers.js**.

#### 2) Remove the following snippet from **server.js** and add to **resources/types.js**

```javascript
const typeDefs = `
  type Country {
    id: Int,
    name: String!,
    code: String,
    capital: String,
    region: String,
    currency: String,
    language: String
  }
  type Query {
    getCountries(name: String): [Country]
  }
`;
```

then append the following line to the end:

```javascript
export default typeDefs;
```

#### 3) Remove the following snippet from **server.js** and add to **resources/resolvers.js**

```javascript
const countryData = [{
  id: 826,
  name: "United Kingdom",
  code: "UK",
  capital: "London",
  region: "Europe",
  currency: "British pound (GBP) - £",
  language: "English"
}];

// Add a resolver.
const resolvers = {
  Query: {
    getCountries: () => countryData
  }
};
```

then append the following line to the end:

```javascript
export default resolvers;
```

#### 4) Import **typeDef** (defined in **resources/types.js**) and **resolvers** (defined in **resources/resolvers.js**) by adding the following lines to **server.js**

```javascript
import typeDefs from './resources/types';
import resolvers from './resources/resolvers';
```

#### 5) Now run `npm start` to ensure it's all working. If successful output form command line should be something like this:

```bash
> simple@1.0.0 start /graphql/graphql-samples/graphql-countries-part2
> nodemon ./server.js --exec babel-node

[nodemon] 1.17.4
[nodemon] to restart at any time, enter `rs`
[nodemon] watching: *.*
[nodemon] starting `babel-node ./server.js`
Go to http://localhost:3000/graphiql to run queries!
```

Then a similar query to [part1](https://github.com/luisw19/graphql-samples/tree/master/graphql-countries-part1) and result should be similar.

#### 6) Now under **/resources** create a file called **data.js** where we'll add the logic to invoke the REST backend for each field of the **query operation** in the **resolvers**.

we'll make use of [node-fetch](https://www.npmjs.com/package/node-fetch) to fetch data from the [REST Countries API](https://github.com/apilayer/restcountries) and [Lodash](https://lodash.com/) to deal with arrays more easily.

a) First we install [node-fetch](https://www.npmjs.com/package/node-fetch) and [lodash](https://lodash.com/) packages:

```bash
npm install --save node-fetch lodash
```

d) Add the following code. Descriptions inline.

```javascript
import fetch from 'node-fetch';
import _ from 'lodash';

// call REST Countries
const countries = {
  getCountriesByName(name) {
    //By default all countries are fetch if no arguments are received
    var URL = "https://restcountries.eu/rest/v2/all/";
    if (name!=undefined){
      //if name argument is received, search country by name
      var URL = "https://restcountries.eu/rest/v2/name/" + name;
    }
    //Fetch URL
    console.log("Fetching URL: " + URL);
    return fetch(URL)
      //returns with a promise
      .then(res => res.json())
      //once promised is fullfiled then we iterate through collection and map the values to the Country type
      .then(res => {
        //console.log(JSON.stringify(res));
        console.log("Total records found: " + res.length);
        const countryData = [];
        //we use the map function of lodash to iterate easily
        _.map(res, function(value, key) {
          countryData[key] = {
            id: value.numericCode,
            name: value.name,
            code: value.alpha3Code,
            capital: value.capital,
            region: value.region + " | " + value.subregion,
            currency: value.currencies[0].name + " | " + value.currencies[0].code + " | " + value.currencies[0].symbol,
            language: value.languages[0].name + " | " + value.languages[0].iso639_2
          };
        });
        return countryData;
      })
      //catch errors if any
      .catch(err => console.error("Error: " + err));
  }
};

export default countries;
```
#### 7) Modify **resources/resolvers.js** as following:

a) first import **coutries** from **data.js**

```javascript
import countries from './data'
```

b) Comment out **countryData** as we'll fetch data in real time.

c) Modify the **resolver** so the **getCountries** query operation takes arguments and also makes use of **countries.getCountriesByName** imported from **data.js**

```javascript
const resolvers = {
  Query: {
    //countries now takes arguments
    getCountries(_, args) {
      //take the argument "name" and use it to search get a country by name
      return countries.getCountriesByName(args.name);
    }
  }
};
```

#### 8) Start the server by running `npm start` and then run the following query:

```graphql
query{
  getCountries {
    id
    name
    code
    capital
    region
    currency
    language
  }
}
```

The result should be a list of around 250 countries.

```bash
Fetching URL: https://restcountries.eu/rest/v2/all/
Total records found: 250
```

> The equivalent call to REST Countries would be:
> https://restcountries.eu/rest/v2/all?fields=numericCode;name;alpha3Code;capital;region;subregion;languages

You can also try a query with **fragments** and **alias**.
This is where the flexibility of GraphQL queries start coming into play.

```graphql
query{
  country1: getCountries(name:"United Kingdom") {
		...fields
  }
  country2: getCountries(name:"Venezuela") {
		...fields
  }
}

fragment fields on Country {
  id
  name
  code
  capital
  region
  currency
  language
}
```

The response should be:

```javascript
{
  "data": {
    "country1": [
      {
        "id": 826,
        "name": "United Kingdom of Great Britain and Northern Ireland",
        "code": "GBR",
        "capital": "London",
        "region": "Europe | Northern Europe",
        "currency": "British pound | GBP | £",
        "language": "English | eng"
      }
    ],
    "country2": [
      {
        "id": 862,
        "name": "Venezuela (Bolivarian Republic of)",
        "code": "VEN",
        "capital": "Caracas",
        "region": "Americas | South America",
        "currency": "Venezuelan bolívar | VEF | Bs F",
        "language": "Spanish | spa"
      }
    ]
  }
}
```

> Note that this single GraphQL query **can't** be performed with an equivalent REST call.
> This is because in REST **each country is its own resource**. Therefore the equivalent call would be:
>
> First call:
>
> https://restcountries.eu/rest/v2/names/United%20Kingdom?fields=numericCode;name;alpha3Code;capital;region;subregion;languages
>
> Second call:
>
> https://restcountries.eu/rest/v2/names/venezuela?fields=numericCode;name;alpha3Code;capital;region;subregion;languages
>
> Also note that each of the calls above are very similar apart from the individual resource (they country) they are accessing.
> This can't be avoided as in REST there isn't a **fragment** concept.

Lastly, below is a similar GraphQL query, however in this case using **variables**.
Variables are useful so values can be passed without having to reconstruct a query every time.

```graphql
query twoCountries($name1: String = "United Kingdom", $name2: String = "Venezuela") {
  country1: getCountries(name: $name1) {
    ...fields
  }
  country2: getCountries(name: $name2) {
    ...fields
  }
}

fragment fields on Country {
  id
  name
  code
  capital
  region
  currency
  language
}
```

> Note that the values for variables $name1 and $name2 can be overridden by simply defining the values.
> In the graphiql editor, this can be done by adding the values defined in JSON for each value in then
> section **QUERY VARIABLES** located lower left-hand side:
> ```javascript
> {
>  "name1": "Sweden",
>  "name2" : "Spain"
> }
> ```

As a final test, let's make use of a **directive** to only display some fields if the value of the directive is **true**.

```GraphQL
query twoCountries($name1: String = "United Kingdom", $name2: String = "Venezuela", $include: Boolean!) {
  country1: getCountries(name: $name1) {
    ...fields
  }
  country2: getCountries(name: $name2) {
    ...fields
  }
  allCountriesWithCode:getCountries{
    ...fields
  }
}

fragment fields on Country {
  id
  name
  code @include(if: $include)
  capital @include(if: $include)
  region @include(if: $include)
  currency @include(if: $include)
  language @include(if: $include)
}
```

> Note that we've added a new variable called "$include" as a mandatory (**!**) **scalar** type.
> Then the directives **@include** or **@skip** can be added next to a field in the query or fragment.
> The conditional **if** then needs to be defined taking as input the **include** variable. Meaning that
> only **if include** equals **true** then the field will be displayed. Lastly the value for the variable
> is also defined. Try changing the value to **false** and see how all fields with the directive are omitted.
>
> ```javascript
> {
>  "name1": "Sweden",
>  "name2" : "Spain",
>  "include" : false
> }
> ```
