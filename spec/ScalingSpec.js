describe("Scaling", function() {
    var s = require('../web_pages/dx50/scaling');
    
    it("convert to", function() {
        result=s.slpoff_from_points( new s.Scaling("testname",[[0,"0.0"],[1,"1.0"]]) );
        expect(result).toEqual({dec: 1, max: 1, min: 0, nm: "testname", off: 0, sgn: false, slp:1});
        expect(result.dec).toEqual(1)
    })
    
    it("should be able to round trip", ()=>{
        var points = new s.Scaling("TestName",[[0,"0.0"],[1,"1.0"]]);
        expect(s.points_from_slpoff(s.slpoff_from_points(points))).toEqual(points)
    })

    const test_points =  [
        [[0,"0.0"],[1,"1.0"]],
        [[-10,"-10.0"],[10,"10.0"]]
    ]

    test_points.forEach((point) => {
        describe(String(point), function() {
            it("can round trip", ()=>{
                var p = new s.Scaling("TestName",point);
                expect(s.points_from_slpoff(s.slpoff_from_points(p))).toEqual(p)
            })
        })
    })
});