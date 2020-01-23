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
	return xfr;
}

// Convert JSON-parsed data from server to Scaling object
this.points_from_slpoff = function (slpoff) {
	var xfr = slpoff;

	x1 = xfr.min;
	y1 = (x1 * xfr.slp + xfr.off).toFixed(xfr.dec);
	x2 = xfr.max;
	y2 = (x2 * xfr.slp + xfr.off).toFixed(xfr.dec);

	return new this.Scaling(xfr.nm, [[x1, y1], [x2, y2]]);
}
}).call(this);