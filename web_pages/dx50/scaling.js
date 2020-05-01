(function(){
// Scaling object for use in html.
this.Scaling = function (name, points) {
	this.nm = name;
	this.x1 = points[0][0];
	this.y1 = points[0][1];
	this.x2 = points[1][0];
	this.y2 = points[1][1];
}

// Convert a Scaling object to data ready for JSON serialization
this.slpoff_from_points = function (points) {
	var xfr = {};
	xfr.nm = points.nm;

	function dp_from_pt(pty) {
		dpidx = pty.lastIndexOf('.');
		return (dpidx < 0) ? 0 : pty.length - dpidx - 1;
	}

	// establish number of decimal places
	try {
			xfr.dec = dp_from_pt(points.y1);
			if (xfr.dec != dp_from_pt(points.y2)) {
				throw "Decimal points do not match";
			}
			if (xfr.dec > 4) {
				xfr.dec = 4
				throw "Decimal points max is 4";
			}
	} catch (error) {
			console.log(error);
	}

	x1 = Number(points.x1);
	y1 = Number(points.y1);
	x2 = Number(points.x2);
	y2 = Number(points.y2);

	xfr.sgn = (y2 < 0) || (y1 < 0);
	xfr.slp = (y2-y1)/(x2-x1);
	xfr.off = y1 - xfr.slp*x1;

	// establish upper and lower on 'x'
	if (x1 < x2) {
		xfr.min = x1;
		xfr.max = x2;
	} else {
		xfr.min = x2;
		xfr.max = x1;
	}

	// determine type
	if ((xfr.max > 65335) || (xfr.min < -65535)) {
		xfr.typ = "i32";
		xfr.slp *= Math.pow(10, xfr.dec);
	} else {
		xfr.typ = "i16"
	}
	return xfr;
}

// Convert JSON-parsed data from server to Scaling object
this.points_from_slpoff = function (slpoff) {
	var xfr = slpoff;
	if (xfr.typ == "i32") xfr.slp /= Math.pow(10, xfr.dec);

	x1 = xfr.min;
	y1 = (x1 * xfr.slp + xfr.off).toFixed(xfr.dec);
	x2 = xfr.max;
	y2 = (x2 * xfr.slp + xfr.off).toFixed(xfr.dec);

	return new this.Scaling(xfr.nm, [[x1, y1], [x2, y2]]);
}

// Convert user JSON to backend JSON
this.firmware_json_from = function (user_json) {
	obj = JSON.parse(user_json);	// TODO: redundant parse in caller

	//convert to scaling objects 
	scalingNames = Object.getOwnPropertyNames(obj.scalings);

	slpoff = [];
	for (var scl of scalingNames) {
		slpoff.push(this.slpoff_from_points(new this.Scaling(scl, [[obj.scalings[scl][0][0], obj.scalings[scl][0][1]], [obj.scalings[scl][1][0], obj.scalings[scl][1][1]]])));
		//console.log(obj.scalings[scl][0][0]);
	}
	obj.scalings = slpoff;

	//same but with measurements
	measurementNames = Object.getOwnPropertyNames(obj.measurements);

	measureFormat = [];
	counter = 0;
	for (var sct of measurementNames) {

		everyObject = //TODO: rewrite
		{
			nm: sct,
			scl: obj.measurements[sct][0],
			phs: obj.measurements[sct][1],
			nxa: obj.measurements[sct][2],
			row: obj.measurements[sct][3]
		}
		if (everyObject.row === undefined) everyObject.row = "one";
		measureFormat.push(everyObject);
	}
	obj.measurements = measureFormat;
	return JSON.stringify(obj);
}
}).call(this);