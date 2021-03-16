const express = require("express");
const router = express.Router();
const path = require("path");

router.get('/*', express.static( path.join( path.sep ) ) );
module.exports = router;