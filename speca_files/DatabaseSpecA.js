'use strict'; /* globals $ CVLIB */
(/** @lends module:CVLIB */function(){

/**
 * Database for a Spec A image repository
 * @constructor
 * @augments Database
 * @param {string} url - path to JSON file
 * @param {function} callback - called after DB initialization with a QuerySet describing the DB Scheme
 */
function DatabaseSpecA(url, callback){
    CVLIB.Database.call( this );

    console.log('Loading:', url);
    var prefix = url.split('/').slice(0,-1).join('/');
    var self = this;
    $.ajax({
        dataType: 'json',
        url: url,
        success: function(json){
            json.databaseDir = prefix+'/';
            if(!self.validateJSON(json))
                return;
            self.json = json;

            var parameters = {};
            for(var i in json.arguments){
                var arg = json.arguments[i];
                parameters[i] = new CVLIB.Parameter(
                    arg.label,
                    arg.type,
                    arg.values,
                    arg.default
                );
            }

            callback( new CVLIB.QuerySet(parameters) );
        },
        error: function(e){
            console.error('Unable to load JSON:', e);
        }
    });
}
DatabaseSpecA.prototype = Object.create( CVLIB.Database.prototype );
DatabaseSpecA.prototype.constructor = DatabaseSpecA;

/**
 * Validate if JSON file is compliant to Spec A
 * @param {JSON} json - JSON object
 * @return {bool}
 */
DatabaseSpecA.prototype.validateJSON = function(json){
    console.log('Processing JSON-File:', json);

    var parseErrorFlag = false;
    var parseError = function(msg){
        console.error('JSON-File does not meet Spec A:', msg);
        parseErrorFlag = true;
    }.bind(this);

    // =========================================================================
    // Check if JSON meets Spec A
    // =========================================================================
    if(    !json.hasOwnProperty( 'arguments'    )
        || !json.hasOwnProperty( 'metadata'     )
        || !json.hasOwnProperty( 'name_pattern' )
    ){
        parseError('JSON-File has no attribute \'arguments\', \'metadata\', or \'name_pattern\'');
    }
    // Check url to json.arguments consistancy
    if( $.type(json.name_pattern) !== 'string' ){
        parseError('json.name_pattern is not of type \'String\'');

    }
    var argumentList = json.name_pattern.match(/\{(.*?)\}/g);
    argumentList.forEach(function(v,i){
        argumentList[i] = v.substring(1,v.length-1);
    });

    var i,j;

    // Check Existance
    for(i in argumentList){
        if(!json.arguments.hasOwnProperty( argumentList[i] ))
            parseError('Argument in URL is not specified in json.arguments');
    }

    var parameter;
    var isContained = false;
    var values = [];
    for(i in json.arguments){
        parameter = json.arguments[i];
        if(!parameter.hasOwnProperty('label')) parseError('Parameter has no label:', parameter);
        if(!parameter.hasOwnProperty('default')) parseError('Parameter has no default value', parameter);
        if(!parameter.hasOwnProperty('values')) parseError('Parameter has no list of values', parameter);
        switch (parameter.type) {
            case 'range':
                if(!$.isNumeric(parameter.default))
                    parseError('Default value of range Parameter is not Numeric', parameter);

                // parameter.default = parseFloat(parameter.default);
                parameter.default = parameter.default;

                values = [];
                isContained = false;
                for(j in parameter.values){
                    if(!$.isNumeric(parameter.values[j]))
                        parseError('Parameter is of type \'range\' but members of its values are not Numeric', parameter);

                    // values[j] = parseFloat(parameter.values[j]);
                    values[j] = parameter.values[j];
                    if(values[j] === parameter.default) isContained = true;
                }
                if(!isContained)
                    parseError('Default value of Parameter is not contained in values', parameter);

                parameter.values = values.sort(function(a,b){ return a-b; });
                break;
            case 'boolean':
                parameter.values = [0,1];
                parameter.default = parameter.default ? 1 : 0;
                break;
            case 'set':
                isContained = false;
                for(j in parameter.values){
                    if(parameter.values[j] === parameter.default) isContained = true;
                }

                break;
            default:
                parseError('Unknown Parameter Type', parameter);
        }
    }

    if(parseErrorFlag) return false;
    console.log('Valid Spec A JSON-File');
    return true;
};

/**
 * Asynchronously processes a querySet and passes the resultSet to a callback
 * @param {QuerySet} querySet
 * @param {function} callback
 */
DatabaseSpecA.prototype.processQuery = function(querySet, callback){
    var i,j;

    var patternReplace = function(pattern, parameters){
        for(i in parameters){
            if($.isArray(parameters[i].query)) continue;
            pattern = pattern.replace('{'+i+'}', parameters[i].query);
        }
        return pattern;
    };

    var pattern = this.json.name_pattern;
    var dir = this.json.databaseDir;
    var resultSet;
    switch(querySet.info.type){
        case 'single':
            resultSet = new CVLIB.ResultSet(
                querySet.serialize(),
                {
                    type: 'image',
                    src: dir + patternReplace(pattern, querySet.parameters)
                }
            );
            break;
        case 'matrix':
            var parameters = querySet.parameters;
            var basePattern = patternReplace(pattern, querySet.parameters);
            var p1 = querySet.info.p1;
            var p2 = querySet.info.p2;
            var p1q = parameters[p1].query;
            var p2q = parameters[p2].query;
            var p1qi, p2qi;
            var data = {};
            for(i in p1q){
                p1qi = p1q[i];
                data[p1qi] = {};
                pattern = basePattern.replace('{'+p1+'}', p1qi);
                for(j in p2q){
                    p2qi = p2q[j];
                    data[p1qi][p2qi] = {
                        type: 'image',
                        src: dir + pattern.replace('{'+p2+'}', p2qi)
                    };
                }
            }

            resultSet = new CVLIB.ResultSet(
                querySet.serialize(),
                data
            );
            break;
        default:
            console.error('Unsupported Mode');
            return;
    }

    querySet.emitter.trigger('processed');

    callback(
        resultSet
    );
};

if(!window.CVLIB) window.CVLIB = {};
window.CVLIB.DatabaseSpecA = DatabaseSpecA;

})();