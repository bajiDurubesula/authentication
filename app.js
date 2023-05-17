const express = require("express");
const app = express();
app.use(express.json());

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const dbPath = path.join(__dirname, "covid19IndiaPortal.db");
let db = null;

const initilization = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Started");
    });
  } catch (e) {
    console.log(`Error: ${e.message}`);
    process.exit(1);
  }
};

initilization();

const logger = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        console.log("c");
        next();
      }
    });
  }
};
//API 1
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const isMatching = `
  SELECT * FROM user WHERE username = '${username}'`;
  const isMatched = await db.get(isMatching);
  if (isMatched !== undefined) {
    const comparingPassword = await bcrypt.compare(
      password,
      isMatched.password
    );
    if (comparingPassword) {
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, "MY_Access_Token");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  } else {
    response.status(400);
    response.send("Invalid user");
  }
});

app.get("/login/", logger, async (request, response) => {
  response.send("Working");
});

//API 2
app.get("/states/", logger, async (request, response) => {
  const states = `
   SELECT 
     state_id AS stateId,
     state_name AS stateName,
     population
   FROM 
     state `;
  const statesList = await db.all(states);
  response.send(statesList);
});

//API 3
app.get("/states/:stateId/", logger, async (request, response) => {
  const { stateId } = request.params;
  const states = `
   SELECT 
     state_id AS stateId,
     state_name AS stateName,
     population
   FROM 
     state 
   WHERE 
     state_id = ${stateId}`;
  const stateList = await db.get(states);
  response.send(stateList);
});

//API 4
app.post("/districts/", logger, async (request, response) => {
  const details = request.body;
  const { districtName, stateId, cases, cured, active, deaths } = details;
  const dataPosted = `
    INSERT INTO district(district_name,state_id,cases,cured,active,deaths)
    VALUES('${districtName}',${stateId},${cases},${cured},${active},${deaths})`;
  await db.run(dataPosted);
  response.send("District Successfully Added");
});

//API 5
app.get("/districts/:districtId/", logger, async (request, response) => {
  const { districtId } = request.params;
  const details = `
   SELECT 
     district_id AS districtId,
     district_name AS districtName,
     state_id AS stateId,
     cases,
     cured,
     active,
     deaths
   FROM 
     district 
   WHERE 
     district_id = ${districtId}`;
  const dbResponse = await db.get(details);
  response.send(dbResponse);
});

//API 6
app.delete("districts/:districtId/", logger, async (request, response) => {
  const { districtId } = request.params;
  const details = `DELETE FROM district WHERE district_id = ${districtId}`;
  await db.run(details);
  response.send("District Removed");
});

//API 7
app.put("/districts/:districtId/", logger, async (request, response) => {
  const { districtId } = request.params;
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const updateQuery = `
    UPDATE district 
    SET 
      district_name = '${districtName}',
      state_id = ${stateId},
      cases = ${cases},
      cured = ${cured},
      active = ${active},
      deaths = ${deaths}
    `;
  await de.run(updateQuery);
  response.send("District Details Updated");
});

//API 8
app.get("/states/:stateId/stats", logger, async (request, response) => {
  const { stateId } = request.params;
  const states = `
   SELECT 
    SUM(district.cases) AS totalCases,
    SUM(district.cured) AS totalCured,
    SUM(district.active) AS totalActive,
    SUM(district.deaths) AS totalDeaths
   FROM 
     state INNER JOIN district ON state.state_id = district.district_id
   WHERE state.state_id = ${stateId}`;
  const stateList = await db.get(states);
  response.send(stateList);
});

module.exports = app;
