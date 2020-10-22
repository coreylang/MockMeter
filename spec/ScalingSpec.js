describe("Scaling", function() {
    var s = require('../web_pages/dx50/scaling');
    
    it("convert to slpoff from points", function() {
        result=s.slpoff_from_points( new s.Scaling("testname",[[0,"0.0"],[1,"1.0"]]) );
        expect(result).toEqual({dec: 1, max: 1, min: 0, nm: "testname", off: 0, sgn: false, slp: 1, typ: "i16"});
    })

    it("convert to points from slpoff", function() {
        result = s.points_from_slpoff({dec: 1, max: 1, min: 0, nm: "testname", off: 0, sgn: false, slp:1})
        expect(result).toEqual(new s.Scaling("testname",[[0,"0.0"],[1,"1.0"]]));
    })

    it("detects 32-bit conversion necessary", function() {
        result=s.slpoff_from_points( new s.Scaling("testname",[[0,"0.0"],[65536,"1.0"]]) );
        expect(result.typ).toEqual("i32");
    })

    const test_points =  {
        "one": [[0,"0.0"],[1,"1.0"]],
        "two": [[-10,"-10.0"],[10,"10.0"]],
        "DegC": [[0,"0.00"], [100,"212.00"]]
    }

    Object.entries(test_points).forEach((test_point) => {
        it("entry "+test_point[0]+" can make round trip", ()=>{
            var p = new s.Scaling(test_point[0], test_point[1]);
            expect(s.points_from_slpoff(s.slpoff_from_points(p))).toEqual(p)
        })
    })

    describe("decimal points", ()=>{
        it("has none", ()=>{
            result=s.slpoff_from_points( new s.Scaling("testname",[[0,"0."],[1,"10."]]) );
            expect(result.dec).toEqual(0);
        });
        it("has one", ()=>{
            result=s.slpoff_from_points( new s.Scaling("testname",[[0,"0.0"],[1,"1.0"]]) );
            expect(result.dec).toEqual(1);
        });
        it("has four", ()=>{
            result=s.slpoff_from_points( new s.Scaling("testname",[[0,"0.0000"],[1,"1.0000"]]) );
            expect(result.dec).toEqual(4);
        });
        it("asserts error", ()=>{
            expect(()=>{
                s.slpoff_from_points( new s.Scaling("testname",[[0,"0.0"],[1,"1.00"]]) );
            }).toThrow();
        });
    });
});

describe("CRegs", function() {
    var s = require('../web_pages/dx50/cregs.js');

    describe("filter for custom screens", ()=>{
        it("allows Volts A", ()=>{
            expect(s.active_user_measurement_for_cscreens([0,0,"Volts A"])).toBeTrue()
        });
        it("allows Volts User 1", ()=>{
            expect(s.active_user_measurement_for_cscreens([0,0,"Volts User 1"])).toBeTrue()
        });
        it("allows User1", ()=>{
            expect(s.active_user_measurement_for_cscreens([0,0,"User1"])).toBeTrue()
        });
        it("blocks User 1", ()=>{
            expect(s.active_user_measurement_for_cscreens([0,0,"User 1"])).toBeFalse()
        });
        it("blocks User 11", ()=>{
            expect(s.active_user_measurement_for_cscreens([0,0,"User 11"])).toBeFalse()
        });
        it("blocks User 111", ()=>{
            expect(s.active_user_measurement_for_cscreens([0,0,"User 111"])).toBeFalse()
        });
        it("allows User 1111", ()=>{
            expect(s.active_user_measurement_for_cscreens([0,0,"User 1111"])).toBeTrue()
        });
        it("allows User 1A", ()=>{
            expect(s.active_user_measurement_for_cscreens([0,0,"User 1A"])).toBeTrue()
        });
    });

    describe("filter orders", ()=>{
        
        NEWO_RESERVED = 144
        function buildit(regmap) {
            vec = new Array
            for (reg of regmap) {
                if (reg[0]==NEWO_RESERVED) {
                    vec.push({'dbIdx':NEWO_RESERVED, 'calcType':0, classMask:0, deadband:0})
                } else {
                    vec.push({'dbIdx': reg[0], 'calcType': reg[1]})
                }
            }
            return {'lists': [{'vec': vec}]}
        }
        console.log(s.filterOrd.reserved)

        it("preserves order items in catalog", ()=>{
            expect(s.filterOrd(
                buildit([[1,1],[2,2]]),
                buildit([[3,3],[2,2],[1,1]])
            )).toEqual(buildit([[1,1],[2,2]]))
        })
        it("filters order items not in catalog", ()=>{
            expect(s.filterOrd(
                buildit([[1,1],[4,4]]),
                buildit([[3,3],[2,2],[1,1]])
            )).toEqual(buildit([[1,1],[NEWO_RESERVED, 0]]))
        })
        it("truncates an empty order", ()=>{
            expect(s.filterOrd(
                buildit([[5,5],[4,4]]),
                buildit([[3,3],[2,2],[1,1]])
            )).toEqual(buildit([]))
        })
    })
});