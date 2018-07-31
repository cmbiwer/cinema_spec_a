'use strict'; /* globals $ */
(function(){
/**
 * Factory for UI Elements
 * @exports UIFactory
 */
var UIFactory = {

    /**
     * Creates a DIV element containing a CANVAS
     * @return {div}
     */
    createViewport: function(){
            var canvas = $('<canvas class="cvlib_canvas"></canvas>');

            var container = $('<div class="cvlib_canvasContainer"></div>');
            container.append(canvas);

            canvas.on('resized', function(canvas, container){
                container.width(canvas.width());
                container.height(canvas.height());
                var w1 = document.getElementsByClassName("cvlib_canvas").item(0).clientWidth;
                var w2 = document.getElementsByClassName("cvlib_queryTable").item(0).clientWidth;
                $(".contain").css("width", w1 + w2 + 10 + 2 * 10);
                $(".content").css("height", canvas.height() + 2 * 5);
            }.bind(null, canvas, container));

            container.canvas = canvas;

            return container;
    },

    /**
     * Helper function which returns a symbol for each parameter type
     * @param {string} type - parameter object
     * @return {string} symbol in html encoding
     */
    getTypeSymbol: function(type){
        switch(type){
            case 'range':
                return '&xharr;';
            case 'set':
                return '&#9863;';
            case 'boolean':
                return '&check;';
            default:
                return type;
        }
    },

    /**
     * Creates a TR element with multiple-value input widgets for a parameter
     * @param {parameter} p - parameter object
     * @return {tr}
     */
    createVariableRow: function(p){
        var tr = $('<tr id="cvlib_row_'+p.label+'" class="cvlib_variableRow"></tr>');

        // Add Label
        var label = $('<td>' + p.label + '</td>');
        label.on('click', function(){
            console.log(this.label, this);
        }.bind(p));
        tr.append(label);

        tr.append('<td>'+this.getTypeSymbol(p.type)+'</td>');

        switch (p.type) {
            case 'range':
                if(p.values.length<2){
                    tr.append('<td>'+p.values[0]+' - '+p.values[0]+'</td><td></td>');
                } else {
                    var minMaxInput = this.createMinMaxNumberInput(p);
                    tr.append(
                        $('<td colspan="2"></td>')
                            .append(minMaxInput[0])
                            .append(minMaxInput[1])
                            .append(' - ')
                            .append(minMaxInput[2])
                            .append(minMaxInput[3])
                    );
                }
                break;
            case 'set':
                if(p.values.length<2){
                    tr.append('<td>'+p.values[0]+'</td><td></td>');
                } else {
                    tr.append( $('<td colspan=2></td>').append( this.createSetInput(p) ) );
                }
                break;
            case 'boolean':
                tr.append('<td></td><td></td>');
                break;
        }

        return tr;
    },

    /**
     * Creates a TR element with single-value input widgets for a parameter
     * @param {parameter} p - parameter object
     * @return {tr}
     */
    createFixedRow: function(p){
        var tr = $('<tr id="cvlib_row_'+p.label+'"></tr>');

        // Add Label
        var label = $('<td>' + p.label + '</td>');
        label.on('click', function(){
            console.log(this.label, this);
        }.bind(p));
        tr.append(label);

        tr.append('<td>'+this.getTypeSymbol(p.type)+'</td>');

        switch (p.type) {
            case 'range':
                if(p.values.length<2){
                    tr.append('<td>'+p.query+'</td><td></td>');
                } else {
                    var sliderInput = this.createSliderInput(p);
                    var numberInput = this.createNumberInput(p);
                    tr.append(
                        $('<td></td>').append(sliderInput),
                        $('<td></td>').append(numberInput)
                    );
                }
                break;
            case 'set':
                if(p.values.length<2){
                    tr.append('<td>'+p.query+'</td><td></td>');
                } else {
                    var selectInput = this.createSelectInput(p);
                    tr.append(
                        $('<td></td>').append(selectInput),
                        '<td></td>'
                    );
                }
                break;
            case 'boolean':
                tr.append('<td></td><td></td>');
                break;
        }

        return tr;
    },

    /**
     * Creates a TABLE element with cells containing viewports based on a resultSet
     * @param {ResultSet} resultSet - used to determine matrix size
     * @return {table}
     */
    createMatrix: function(resultSet){
        var table = $('<table class="cvlib_matrix"></table>');
        var map = {};

        for(var i in resultSet.data){
            var tr = $('<tr></tr>');
            map[i] = {};
            for(var j in resultSet.data[i]){
                var viewport = this.createViewport();
                viewport.append('<span>('+i+', '+j+')</span>');
                tr.append( $('<td></td>').append(viewport) );
                map[i][j] = viewport;
            }
            table.append(tr);
        }

        table.viewportMap = map;

        table.on('transformed', function(e){
            var style = e.target.style;
            this
                .css({
                    left: style.left,
                    top: style.top,
                })
                .width(style.width)
                .height(style.height);
        }.bind(table.find('canvas')));

        return table;
    },

    /**
     * Creates a TABLE element with multiple-value input widgets for two parameters and single-value widgets for the others based on a querySet
     * @param {QuerySet} querySet - contains parameters used to generate the table
     * @return {table}
     */
    createVersusQueryTable: function(querySet){
        var table = this.createSimpleQueryTable(querySet);

        var parameters = Object.keys(querySet.parameters);
        if(parameters.length<2){
            console.error('Cannot create Versus Table for querySets with less then 2 parameters.');
            return;
        }

        var sel1 = this.createRawSelectInput( parameters );
        sel1.oldValue = parameters[0];
        sel1.val(parameters[0]);
        var sel2 = this.createRawSelectInput( parameters );
        sel2.oldValue = parameters[1];
        sel2.val(parameters[1]);

        var updateTable = function(){
            var p1 = sel1.val();
            var p2 = sel2.val();

            var oldP1 = querySet.info.p1;
            var oldP2 = querySet.info.p2;

            if(p1 === p2){
                sel1.val(oldP1);
                sel2.val(oldP2);
                return;
            }

            querySet.info.p1 = p1;
            querySet.info.p2 = p2;

            var oldRow, newRow, p;

            var replaceVariableRow = function(id){
                oldRow = table.find('#cvlib_row_'+id);
                p = querySet.parameters[id];
                p.query = p.values[0];
                newRow = UIFactory.createFixedRow(p);
                oldRow.after( newRow );
                oldRow.remove();
            };

            var replaceFixedRow = function(id){
                oldRow = table.find('#cvlib_row_'+id);
                p = querySet.parameters[id];
                p.query = [p.values[0]];
                newRow = UIFactory.createVariableRow(p);
                oldRow.after( newRow );
                oldRow.remove();
            };

            if(oldP1 !== p1){
                if(oldP1) replaceVariableRow(oldP1);
                replaceFixedRow(p1);
                table.trigger('resized');
            }
            if(oldP2 !== p2){
                if(oldP2) replaceVariableRow(oldP2);
                replaceFixedRow(p2);
                table.trigger('resized');
            }
        };

        sel1.on('change', updateTable);
        sel2.on('change', updateTable);

        table.prepend(
            $('<tr></tr>')
                .append(
                    $('<td colspan=4></td>')
                        .append(sel1)
                        .append(' VS ')
                        .append(sel2)
                )
        );

        querySet.info = {
            type: 'matrix',
            p1: null,
            p2: null,
        };

        updateTable();

        return table;
    },

    /**
     * Creates a TABLE element with single-value input widgets based on a querySet
     * @param {QuerySet} querySet - its parameters will be the targets of the input widgets
     * @return {table}
     */
    createSimpleQueryTable: function(querySet){
        var tr, table = $('<table class="cvlib_queryTable"></table>');

        var p,i;
        for(i in querySet.parameters){
            p = querySet.parameters[i];
            table.append( this.createFixedRow(p) );
        }

        return table;
    },

    /**
     * Creates a number INPUT element with min, max, and default value
     * @param {number} min - min
     * @param {number} max - max
     * @param {number} value - default value
     * @return {input}
     */
    createRawNumberInput: function(min, max, value){
        // return $('<input type="number" min="'+min+'" max="'+max+'" value="'+value+'">');
        // Fix number format
        // return $('<input type="number" value="'+value+'" readonly>');
        return $('<input class="cvlib_numberInput" type="text" value="'+value+'" readonly>');
    },

    /**
     * Creates a number INPUT element for a parameter
     * @param {parameter} p - target of the input widget
     * @return {input}
     */
    createNumberInput: function(p) {
        var input = this.createRawNumberInput(p.values[0], p.values[p.values.length-1], p.query);

        input.oldValue = p.query;

        p.emitter.on('change', function(input, e, p){
            input.oldValue = p.query;
            input.val(p.query);
        }.bind(null, input));

        // Fix number format
        // input.on('input', function(input, p){
        //     var v = parseFloat(input.val());
        //     v = input.oldValue < v
        //         ? p.values[ Math.min(p.values.indexOf(input.oldValue)+1, p.values.length-1)]
        //         : p.values[ Math.max(p.values.indexOf(input.oldValue)-1, 0)];
        //     p.setValue(parseFloat(v));
        // }.bind(null, input, p));

        return input;
    },

    /**
     * Creates a range INPUT element for a min, max, and default value
     * @param {number} min - min
     * @param {number} max - max
     * @param {number} value - default value
     * @return {input}
     */
    createRawSliderInput: function(min, max, value){
        return $('<input type="range"  min="'+min+'" max="'+max+'" value="'+value+'">');
    },

    /**
     * Creates a range INPUT element for a parameter
     * @param {parameter} p - target of the input widget
     * @return {input}
     */
    createSliderInput: function(p) {
        var input = this.createRawSliderInput(0, p.values.length-1, p.values.indexOf(p.query));

        p.emitter.on('change', function(input, e, p){
            input.val( parseInt(p.values.indexOf(p.query)) );
        }.bind(null, input));

        input.on('input', function(input, p){
            p.setValue( p.values[input.val()] );
        }.bind(null, input, p));

        return input;
    },

    /**
     * Creates a SELECT element for a set of labels and values
     * @param {string[]} labels
     * @param {object[]} values
     * @return {select}
     */
    createRawSelectInput: function(labels, values){
        var select = $('<select></select>');
        for(var i in labels)
            select.append('<option'+ (values ? ' value="'+values[i]+'"' : '') +'>'+labels[i]+'</option>');

        return select;
    },

    /**
     * Creates a SELECT element for a parameter
     * @param {parameter} p - target of the input widget
     * @return {input}
     */
    createSelectInput: function(p){
        var select = this.createRawSelectInput(p.values);

        p.emitter.on('change', function(select, e, p){
            select.val(p.query);
        }.bind(null, select));

        select.on('change', function(select, p){
            p.setValue(select.val());
        }.bind(null, select, p));

        return select;
    },

    /**
     * Creates a checkbox INPUT element
     * @param {bool} checked - default
     * @return {input}
     */
    createRawCheckboxInput: function(checked){
        return $('<input type="checkbox" ' + (checked ? 'checked' : '') + '>');
    },

    /**
     * Creates a checkbox INPUT element for a parameter
     * @param {parameter} p - target of the input widget
     * @return {input}
     */
    createCheckboxInput: function(p){
        var select = this.createRawSelectInput(p);

        p.emitter.on('change', function(select, e, p){
            select.val(p.query);
        }.bind(null, select));

        select.on('change', function(select, p){
            p.setValue(select.val());
        }.bind(null, select, p));

        return select;
    },

    /**
     * Creates a pair of synchronized number INPUT elements for a parameter representing a min and max value
     * @param {parameter} p - target of the input widgets
     * @return {Array.<input>} the min and max element
     */
    createMinMaxNumberInput: function(p) {
        var minInput = $('<input type="number" value="0" min="0" max="'+(p.values.length-1)+'" step="1"></input>');
        var minInputVis = this.createRawNumberInput(0,0,p.query[0]);

        var maxInput = $('<input type="number" value="0" min="0" max="'+(p.values.length-1)+'" step="1"></input>');
        var maxInputVis = this.createRawNumberInput(0,0,p.query[0]);

        minInput.on('input', function(){
            var v1 = parseInt(minInput.val());
            minInputVis.val(p.values[v1]);

            var v2 = parseInt(maxInput.val());
            if(v1>v2){
                maxInput.val(v1);
                maxInputVis.val(p.values[v1]);
                v2=v1;
            }

            var query = [];
            for(var i=v1; i<=v2; i++)
                query.push(p.values[i]);
            p.setValue(query);
        });

        maxInput.on('input', function(){
            var v2 = parseInt(maxInput.val());
            maxInputVis.val(p.values[v2]);

            var v1 = parseInt(minInput.val());
            if(v1>v2){
                minInput.val(v2);
                minInputVis.val(p.values[v2]);
                v1=v2;
            }

            var query = [];
            for(var i=v1; i<=v2; i++)
                query.push(p.values[i]);
            p.setValue(query);
        });

        // var inputMin = this.createRawNumberInput(p.values[0], p.values[p.values.length-1], p.query[0]);
        // var inputMax = this.createRawNumberInput(p.values[0], p.values[p.values.length-1], p.query[p.query.length-1]);

        // inputMin.oldValue = p.query[0];
        // inputMax.oldValue = p.query[p.query.length-1];

        // p.emitter.on('change', function(inputMin, inputMax, e, p){
        //     inputMin.oldValue = p.query[0];
        //     inputMin.val(p.query[0]);

        //     inputMax.oldValue = p.query[p.query.length-1];
        //     inputMax.val(p.query[p.query.length-1]);
        // }.bind(null, inputMin, inputMax));

        // Fix number input
        // inputMin.on('input', function(inputMin, inputMax, p){
        //     var v = parseFloat(inputMin.val());
        //     v = inputMin.oldValue < v
        //         ? p.values[ Math.min(p.values.indexOf(inputMin.oldValue)+1, p.values.length-1)]
        //         : p.values[ Math.max(p.values.indexOf(inputMin.oldValue)-1, 0)];
        //     v = parseFloat(v);
        //     if(parseFloat(inputMax.val())<v){
        //         inputMax.val(v);
        //         inputMax.oldValue = v;
        //     }
        //     inputMin.val(v);
        //     inputMin.oldValue = v;

        //     var query = [];
        //     for(var i=p.values.indexOf(v); i<=p.values.indexOf(parseFloat(inputMax.val())); i++)
        //         query.push(p.values[i]);

        //     p.setValue(query);
        // }.bind(null, inputMin, inputMax, p));

        // inputMax.on('input', function(inputMin, inputMax, p){
        //     var v = parseFloat(inputMax.val());
        //     v = inputMax.oldValue < v
        //         ? p.values[ Math.min(p.values.indexOf(inputMax.oldValue)+1, p.values.length-1)]
        //         : p.values[ Math.max(p.values.indexOf(inputMax.oldValue)-1, 0)];
        //     v = parseFloat(v);
        //     if(parseFloat(inputMin.val())>v){
        //         inputMin.val(v);
        //         inputMin.oldValue = v;
        //     }
        //     inputMax.val(v);
        //     inputMax.oldValue = v;

        //     var query = [];
        //     for(var i=p.values.indexOf(parseFloat(inputMin.val())); i<=p.values.indexOf(v); i++)
        //         query.push(p.values[i]);

        //     p.setValue(query);
        // }.bind(null, inputMin, inputMax, p));

        return [minInput, minInputVis, maxInput, maxInputVis];
    },

    /**
     * Creates a container containing two interactive lists based on parameter. The first list contains all available options and the other all selected options.
     * @param {parameter} p - target of the input widgets
     * @return {div}
     */
    createSetInput: function(p){
        var container = $('<div class="cvlib_setInput"></div>');
        var sourceList = $('<ul></ul>');
        var targetList = $('<ul></ul>');

        var dragElement = null;

        var updateSetInput = function(){
            var values = [];
            var temp = targetList.find('li');
            for(var i=0, j=temp.length-1; i<j; i++)
                values.push(temp[i].innerHTML);
            p.setValue(values);
        };

        var addDragListeners = function(li){
            li.on('dragenter', function(){
                $(this).addClass('dragOver');
            });
            li.on('dragover', function(e){
                e.preventDefault();
            });
            li.on('dragleave', function(){
                $(this).removeClass('dragOver');
            });
            li.on('dragstart', function(e){
                dragElement = this;
            });
            li.on('drop', function(e){
                $(this).removeClass('dragOver');
                if(dragElement!=this){
                    $(this).before(dragElement);
                    updateSetInput();
                }
            });
        };

        var ghost = $('<li></li>');
        addDragListeners(ghost);
        targetList.append(ghost);

        var createTargetLi = function(v){
            var li = $('<li draggable="true">'+v+'</li>');
            addDragListeners(li);
            li.on('click', function(e){
                if(e.which === 2 && targetList.find('li').length>2){
                    $(this).remove();
                    updateSetInput();
                }
            });
            return li;
        };

        var addTarget = function(e){
            if(!targetList.find('li:contains('+this.v+')').length){
                ghost.before( createTargetLi(this.v) );
                updateSetInput();
            }
        };

        p.emitter.on('change', function(e){
            var i,dej;
            var temp = ghost.prev();
            while(temp.length){
                temp.remove();
                temp = ghost.prev();
            }
            for(i in p.query){
                ghost.before( createTargetLi(p.query[i]) );
            }
        });

        var i;

        for(i in p.query){
            ghost.before( createTargetLi(p.query[i]) );
        }

        for(i in p.values){
            var source = $('<li>'+p.values[i]+'</li>');
            source[0].v = p.values[i];
            source.on('click', addTarget);
            sourceList.append(source);
        }
        container.append(sourceList, targetList);

        return container;
    },

    /**
     * Creates a container containing a sidebar and content container
     * @return {div}
     */
    createSidebarLayout: function(){
        var container = $('<div class="content"></div>');
        var sidebar = $('<div style="float: left" align="left"><div class="cvlib_sidebarLayoutSidebar"></div></div>');
        var content = $('<div style="float: left" align="left"><div class="cvlib_sidebarLayoutContent"></div></div>');
        var oldAppend = content.append;
        content.append = function(dom){
            //content.css({left: sidebar[0].getBoundingClientRect().right});
            oldAppend.apply(this, dom);
        };

        sidebar.on('resized', function(){
            content.css({left: sidebar[0].getBoundingClientRect().right});
        });

        container.append(content, sidebar);

        container.sidebar = sidebar;
        container.content = content;

        return container;
    },

    /**
     * Creates a DIV element representing a loading bar with the functions 'setSteps' and 'progress'.
     * @return {div}
     */
    createLoadingBar: function(){
        var bar = $('<div class="cvlib_loadingBar"></div>');
        bar.setSteps = function(steps){
            this.width(0);
            this.fadeIn(0);
            this.step = 0;
            this.steps = steps;
        };
        bar.progress = function(){
            this.step++;
            this.width( this.step/this.steps * $(window).width() );
            if(this.step === this.steps)
                this.fadeOut(300);
        };
        return bar;
    },

    /**
     * Creates a DIV element representing a loading symbol
     * @return {div}
     */
    createLoadingSymbol: function(){
        return $('<div class="cvlib_loadingSymbol">Loading...</div>');
    }
};

if(!window.CVLIB) window.CVLIB = {};
window.CVLIB.UIFactory = UIFactory;

})();
