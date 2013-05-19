/**
 * CiCiUI Chart v1.0.5
 * http://ciciui.com/chart/index.html
 * ===================== Free (Non-Commercial) License ==========================
 * For non-commercial, personal projects and applications, you may use CiCiUI
 * Chart under the terms of the MIT License. You may use CiCiUI Chart for free.
 * ===================== Commercial License =====================================
 * This is the appropriate option if you want to use CiCiUI Chart to develop commercial
 * websites or applications. Please refer to the following link for more details
 * http://ciciui.com/chart/purchase.html
 *
 * Copyright 2013 CiCiUI
 */

(function($){
    /***************** IE ***********************/
    if (!Number.prototype.toFixed){
        Number.prototype.toFixed = function(precision) {
            var power = Math.pow(10, precision || 0);
            return String(Math.round(this * power)/power);
        }
    }

    var baseConfig = {
        bgFillColor: "#FFF",
        fontFamily: "serif, sans-serif, monospace",
        fontSize: 10,
        fontColor: "#000"
    };

    var defaultBarConfig = $.extend({}, baseConfig, {
        gridStrokeColor: "rgba(0, 0, 0, .3)",
        numberCoordinateCount: 8
        /* type: stacked */
    });

    var defaultPieConfig = $.extend({}, baseConfig);

    var defaultPolarAreaConfig = $.extend({}, baseConfig, {
        circleColor: "rgba(0, 0, 0, .2)",
        circleCount: 8
    });

    var defaultDoughnutConfig = $.extend({}, baseConfig, {
        holeRadiusFactor: 0.3 /* 0< r < 1.0 */
    });

    var defaultLineConfig = $.extend({}, baseConfig, {
        gridStrokeColor: "rgba(0, 0, 0, .3)",
        numberCoordinateCount: 8,
        circleRadius: 3
        /* type: area */
    });

    var defaultRadarConfig = $.extend({}, baseConfig, {
        webGridStrokeColor: "rgba(0, 0, 0, .2)",
        webGridCount: 4,
        lineWidth: 2
    });

    var BaseChart = function(canvasDiv, width, height, dataSheet, userConfig, defaultConfig){
        if(canvasDiv===undefined) return;
        $(canvasDiv).addClass('ciciui-chart');
        this.canvasDiv = canvasDiv;
        this.width=width;
        this.height=height;
        this.dataSheet = dataSheet;
        var canvas = $('<canvas>').attr({
            width: width,
            height: height
        }).css({
            position: 'absolute',
            top: 0,
            left: 0
        }).addClass('canvas').appendTo(canvasDiv)[0];
        this.tooltipDiv = $('<div class="chart-tooltip"></div>').appendTo(canvasDiv).hide()[0];
        var maskCanvas = $('<canvas>').attr({
            width: width,
            height: height
        }).css({
            position: 'absolute',
            top: 0,
            left: 0
        }).addClass('mask').appendTo(canvasDiv)[0];
        $(maskCanvas).mouseenter($.proxy(this.onMouseEnter, this))
            .mousemove($.proxy(this.onMouseMove, this))
            .mouseout($.proxy(this.onMouseOut, this));
        if(!canvas.getContext){
            G_vmlCanvasManager.initElement(canvas);
            G_vmlCanvasManager.initElement(maskCanvas);
        }

        var ctx = this.ctx = canvas.getContext("2d");
        this.config = mergeConfig(defaultConfig, userConfig);
        ctx.font = [this.config.fontSize+"pt", this.config.fontFamily].join(" ");
        this.singleCharWidth = ctx.measureText('X').width;

        this.fillBackground();

        this.elementInfo = { elements: [] };

        this.draw(dataSheet, width, height, this.ctx);
    };

    BaseChart.prototype.fillBackground = function(){
        //fill background
        this.ctx.fillStyle = this.config.bgFillColor;
        this.ctx.fillRect(0, 0, this.width, this.height);
    };

    BaseChart.prototype.onMouseEnter = function(){
        $(this.tooltipDiv).css({
            position: 'absolute'
        }).show();
    };

    BaseChart.prototype.onMouseMove = function(event){
        var parentOffset = $(this.canvasDiv).offset();
        var element = this.findHoverElement(event.pageX-parentOffset.left, event.pageY-parentOffset.top);
        if(element){
            this.showTooltip(element);
        }
    };

    BaseChart.prototype.onMouseOut = function(){
        $(this.tooltipDiv).hide();
    };

    BaseChart.prototype.drawHeaderIndicator = function(headerArray, colorArray, headerIndicatorArea){
        //draw data header color indicator
        var indicatorSquareWidth = this.config.fontSize;
        var tx = headerIndicatorArea.x + indicatorSquareWidth + this.singleCharWidth;
        for(var i=0; i<headerArray.length; i++){
            this.ctx.fillStyle = colorArray[i];
            this.ctx.fillRect(headerIndicatorArea.x + this.singleCharWidth,
                i*this.config.fontSize*2+headerIndicatorArea.y,
                indicatorSquareWidth, indicatorSquareWidth);
            this.ctx.fillStyle = this.config.fontColor;
            this.ctx.fillText(headerArray[i],
                              tx,
                              i*this.config.fontSize*2+this.config.fontSize+headerIndicatorArea.y);
        }
    };

    BaseChart.prototype.drawTitle = function(titleArea){
        if(!this.config.title) return;
        var ctx = this.ctx;
        ctx.font = ['bold', this.config.fontSize*2+"pt", this.config.fontFamily].join(" ");
        var textWidth=ctx.measureText(this.config.title).width;
        ctx.fillText(this.config.title,
                    titleArea.x+titleArea.width/2-textWidth/2,
                    titleArea.y+titleArea.height/2+this.config.fontSize);
        ctx.font = this.config.font;
    };

    BaseChart.prototype.calculateTooltipPosition = function(top, left){
        var tooltipWidth = $(this.tooltipDiv).width(),
            tooltipHeight = $(this.tooltipDiv).height();
        if(top<0){
            top = 0;
        } else if ( (top+tooltipHeight) > this.height ){
            top = this.height - tooltipHeight;
        }

        if(left<0){
            left = 0;
        } else if( (left+tooltipWidth) > this.width ){
            left = this.width - tooltipWidth;
        }
        return {
            top: top,
            left: left
        };
    };

    /*------------------- Base GridLine Chart ---------------------*/
    var BaseGridLineChart = function(canvasDiv, width, height, dataSheet, userConfig, defaultConfig){
        if(canvasDiv===undefined) return;
        if(userConfig && userConfig.numberCoordinateCount)
        userConfig.numberCoordinateCount = Math.ceil(userConfig.numberCoordinateCount/2)*2;
        BaseChart.call(this, canvasDiv, width, height, dataSheet, userConfig, defaultConfig);
    };
    BaseGridLineChart.prototype = new BaseChart;
    BaseGridLineChart.prototype.constructor = BaseGridLineChart;

    BaseGridLineChart.prototype.calculateRange=function(barChartRectHeight){
        var valueArray = [], i, j;

        for(i=1; i<this.dataSheet.length; i++){
            var data = this.dataSheet[i];
            for(j=1; j<data.length; j++){
                valueArray.push(data[j]);
            }
        }
        return calculateRange(this.config.numberCoordinateCount, barChartRectHeight, valueArray, this.ctx);
    };

    var Bar = function(canvasDiv, width, height, dataSheet, userConfig, defaultConfig){
        BaseGridLineChart.call(this, canvasDiv, width, height, dataSheet, userConfig, defaultConfig);
    };

    Bar.prototype = new BaseGridLineChart;
    Bar.prototype.constructor = Bar;

    Bar.prototype.draw = function(dataSheet, width, height, ctx){
        var config=this.config, labelArray = [], i, j;
        for(i=0; i<dataSheet.length; i++){
            labelArray.push(dataSheet[i][0]);
        }

        //calculate drawing area
        var labelHeight = config.fontSize * 2;
        var titleArea = {
            x: 0, y: 0, width: width, height: config.title ? labelHeight*2 : config.fontSize
        };
        var valueRangeArea ={
            x: 0, y: height - labelHeight, width: width, height: labelHeight
        };
        var labelArea = {
            x:0, y: titleArea.y+titleArea.height, width: calculateMaxWidth(labelArray, ctx, config.fontSize),
            height: height - valueRangeArea.height - titleArea.height
        };
        var headerIndicatorWidth = calculateMaxWidth(dataSheet[0].slice(1), ctx, config.fontSize);
        var headerIndicatorArea = {
            x:width-headerIndicatorWidth, y: titleArea.y+titleArea.height,
            width: headerIndicatorWidth, height: height - valueRangeArea.height - titleArea.height
        };
        var drawingArea = {
            x: labelArea.x+labelArea.width, y: titleArea.y+titleArea.height,
            width: width-labelArea.width-headerIndicatorArea.width,
            height: height-titleArea.height-valueRangeArea.height
        };

        var rangeInfo;
        if(config.type && config.type==='stacked'){//Stacked Bar Chart
            var valueArray = [], sumPositive= 0, sumNegative=0, dataSeries, d=0;
            for(i=1; i<dataSheet.length; i++){
                sumPositive = 0;
                sumNegative = 0;
                dataSeries = dataSheet[i];
                for(j=1; j<dataSeries.length; j++){
                    d = dataSeries[j];
                    if(d>=0)
                        sumPositive += d;
                    else
                        sumNegative += d;
                }
                if(sumPositive!=0) valueArray.push(sumPositive);
                if(sumNegative!=0) valueArray.push(sumNegative);
            }
            rangeInfo = calculateRange(config.numberCoordinateCount, drawingArea.width, valueArray, ctx);
        } else
            rangeInfo = this.calculateRange(drawingArea.width);

        //draw value range area and grid line
        var zeroX = 0;
        ctx.beginPath();
        ctx.strokeStyle = config.gridStrokeColor;
        for(i=0; i<=config.numberCoordinateCount; i++){
            var value = rangeInfo.start + i*rangeInfo.stepSize;
            var x = drawingArea.x+i*rangeInfo.stepLength + 0.5;//0.5 anti-aliasing
            if(value==0){
                zeroX = x;
            } else {
                ctx.moveTo(Math.floor(x)+0.5, drawingArea.y);
                ctx.lineTo(Math.floor(x)+0.5, drawingArea.y+drawingArea.height);
            }
            ctx.fillStyle = config.fontColor;
            var text = value.toFixed(rangeInfo.stepFix);
            if(parseFloat(text)===0)
                text = '0';
            ctx.fillText(text, x-ctx.measureText(text).width/2, valueRangeArea.y+labelHeight);
        }
        ctx.stroke();
        //zero
        ctx.beginPath();
        ctx.strokeStyle = "#000";
        ctx.moveTo(Math.floor(zeroX)+0.5, drawingArea.y);
        ctx.lineTo(Math.floor(zeroX)+0.5, drawingArea.y+drawingArea.height);
        ctx.stroke();

        //draw bar and labels
        var barHeight = drawingArea.height/(dataSheet.length-1),
            barPadding = barHeight / 8,
            elementCount = dataSheet[0].length - 1,
            colorArray = getColorArray(elementCount),
            barElementHeight;
        if(config.type && config.type.toLowerCase()=='stacked')
            barElementHeight = barHeight - barPadding*2;
        else
            barElementHeight = (barHeight - barPadding*2) / elementCount;
        for(i=1; i<dataSheet.length; i++){
            var data = dataSheet[i], barWidth, sumPositiveValue= 0, sumNegativeValue = 0, startX;
            ctx.fillStyle = config.fontColor;

            ctx.fillText(data[0], labelArea.x, drawingArea.y+(i-0.5)*barHeight);

            for(j=1; j<data.length; j++){
                barWidth = rangeInfo.stepLength/rangeInfo.stepSize*data[j];
                if(config.type && config.type.toLowerCase()=='stacked'){
                    if(data[j]>0){
                        startX = rangeInfo.stepLength/rangeInfo.stepSize*sumPositiveValue+zeroX;
                        sumPositiveValue += data[j];
                    } else if(data[j]<0) {
                        startX = rangeInfo.stepLength/rangeInfo.stepSize*sumNegativeValue+zeroX;
                        sumNegativeValue += data[j];
                    } else {
                        continue;
                    }
                    this.drawRectBar(startX, drawingArea.y+(i-1)*barHeight+barPadding, barWidth, barElementHeight,
                                    colorArray[j-1], data[0], dataSheet[0][j], data[j]);
                } else {
                    this.drawRectBar(zeroX, drawingArea.y+(i-1)*barHeight+barPadding+(j-1)*barElementHeight,
                        barWidth, barElementHeight, colorArray[j-1], data[0], dataSheet[0][j], data[j]);
                }
            }
        }

        this.drawHeaderIndicator(dataSheet[0].slice(1), colorArray, headerIndicatorArea);
        this.drawTitle(titleArea);
    };

    Bar.prototype.findHoverElement=function(x, y){
        var element, i;
        for(i=0; i<this.elementInfo.elements.length; i++){
            element = this.elementInfo.elements[i];
            if(element.width<0){
                if(x<element.x && x>=(element.x+element.width) && y>=element.y && y<(element.y+element.height))
                    return element;
            } else {
                if(x>=element.x && x<(element.x+element.width) && y>=element.y && y<(element.y+element.height))
                    return element;
            }
        }
        return null;
    };

    Bar.prototype.showTooltip = function(element){
        var top = element.y+(element.height<0 ? 10 : -$(this.tooltipDiv).height()-10),
            left = element.x+element.width,
            pos;
        $(this.tooltipDiv).html('<p class="desc">' + element.label + '<br /><a style="color:' + element.color + '">' +
                                element.header + ': </a>' + element.value + '</p>');
        pos = this.calculateTooltipPosition(top, left);
        $(this.tooltipDiv).css({
            top: pos.top,
            left: pos.left
        }).show();
    };

    Bar.prototype.drawRectBar=function (x, y, width, height, color, label, header, value){
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, width, height);
        this.elementInfo.elements.push({
            x: x, y: y, width: width, height: height, color: color, label: label, header: header, value: value
        });
    };

    var Column = function(canvasDiv, width, height, dataSheet, userConfig, defaultConfig){
        BaseGridLineChart.call(this, canvasDiv, width, height, dataSheet, userConfig, defaultConfig);
    };

    Column.prototype = new BaseGridLineChart;
    Column.prototype.constructor = Column;

    Column.prototype.draw=function(dataSheet, width, height, ctx){
        var config = this.config, i, j;
        //calculate drawing area
        var labelHeight = config.fontSize * 2;
        var labelArea = {
            x: 0, y: height - labelHeight, width: width, height: labelHeight
        };
        var titleArea = {
            x: 0, y: 0, width: width, height: config.title ? labelHeight*2 : config.fontSize
        };
        var rangeInfo;
        if(config.type && config.type=='stacked'){ //Stacked Column Chart
            var valueArray = [], sumPositive, sumNegative, dataSeries, d;
            for(i=1; i<dataSheet.length; i++){
                sumPositive = 0;
                sumNegative = 0;
                dataSeries = dataSheet[i];
                for(j=1; j<dataSeries.length; j++){
                    d = dataSeries[j];
                    if(d>=0)
                        sumPositive += d;
                    else
                        sumNegative += d;
                }
                if(sumPositive!=0) valueArray.push(sumPositive);
                if(sumNegative!=0) valueArray.push(sumNegative);
            }
            rangeInfo = calculateRange(config.numberCoordinateCount, height-titleArea.height-labelArea.height, valueArray, ctx);
        } else
            rangeInfo = this.calculateRange(height-titleArea.height-labelArea.height);
        var valueRangeArea = {
            x: 0, y:titleArea.y+titleArea.height,
            width: rangeInfo.rangeTextWidth, height: height - labelArea.height - titleArea.height
        };
        var headerIndicatorWidth = calculateMaxWidth(dataSheet[0].slice(1), ctx, config.fontSize);
        var headerIndicatorArea = {
            x:width-headerIndicatorWidth, y: titleArea.y+titleArea.height,
            width: headerIndicatorWidth, height: height - labelArea.height - titleArea.height
        };
        var drawingArea = {
            x: valueRangeArea.x+valueRangeArea.width, y: titleArea.y+titleArea.height,
            width: width-valueRangeArea.width-headerIndicatorArea.width,
            height: height-valueRangeArea.height-titleArea.height
        };

        //draw value range area and grid line
        var zeroY = 0;
        ctx.beginPath();
        ctx.strokeStyle = config.gridStrokeColor;
        for(i=0; i<=config.numberCoordinateCount; i++){
            var value = rangeInfo.start + i*rangeInfo.stepSize;
            var y = valueRangeArea.y+valueRangeArea.height-i*rangeInfo.stepLength + 0.5;//0.5 anti-aliasing
            if(value==0){
                zeroY = y;
            } else {
                ctx.moveTo(drawingArea.x, Math.floor(y)+0.5);
                ctx.lineTo(drawingArea.x+drawingArea.width, Math.floor(y)+0.5);
            }
            ctx.fillStyle = config.fontColor;
            ctx.fillText(value.toFixed(rangeInfo.stepFix), valueRangeArea.x, y+config.fontSize/2);
        }
        ctx.stroke();
        ctx.beginPath();
        ctx.fillStyle = "#000";
        ctx.strokeStyle = "#000";
        ctx.moveTo(drawingArea.x, Math.floor(zeroY)+0.5);
        ctx.lineTo(drawingArea.x+drawingArea.width, Math.floor(zeroY)+0.5);
        ctx.stroke();

        //draw bar and labels
        var barWidth = drawingArea.width/(dataSheet.length-1),
            barPadding = barWidth / 8,
            elementCount = dataSheet[0].length - 1,
            colorArray = getColorArray(elementCount),
            barElementWidth;
        if(config.type && config.type=='stacked')
            barElementWidth = barWidth - barPadding*2;
        else
            barElementWidth = (barWidth - barPadding*2) / elementCount;

        for(i=1; i<dataSheet.length; i++){
            var data = dataSheet[i], barHeight, sumPositiveValue= 0, sumNegativeValue= 0, startY=0;
            ctx.fillStyle = config.fontColor;
            ctx.fillText(data[0], drawingArea.x+(i-0.5)*barWidth-ctx.measureText(data[0]).width/2,
                                  labelArea.y+labelArea.height *.75);

            for(j=1; j<data.length; j++){
                barHeight = rangeInfo.stepLength/rangeInfo.stepSize*data[j];
                if(config.type && config.type=='stacked'){
                    if(data[j]>0){
                        startY = zeroY - rangeInfo.stepLength/rangeInfo.stepSize*sumPositiveValue;
                        sumPositiveValue += data[j];
                    } else if(data[j]<0){
                        startY = zeroY - rangeInfo.stepLength/rangeInfo.stepSize*sumNegativeValue;
                        sumNegativeValue += data[j];
                    } else {
                        continue;
                    }
                    this.drawRectBar(drawingArea.x+(i-1)*barWidth+barPadding, startY-barHeight,
                                        barElementWidth, barHeight, colorArray[j-1], data[0], dataSheet[0][j], data[j]);
                } else {
                    this.drawRectBar(drawingArea.x+(i-1)*barWidth+barPadding+(j-1)*barElementWidth, zeroY-barHeight,
                                        barElementWidth, barHeight, colorArray[j-1], data[0], dataSheet[0][j], data[j]);
                }
            }
        }

        this.drawHeaderIndicator(dataSheet[0].slice(1), colorArray, headerIndicatorArea);
        this.drawTitle(titleArea);
    };

    Column.prototype.showTooltip=function(element){
        var top = element.y+(element.height<0 ? 10 : -$(this.tooltipDiv).height()-10),
            left = element.x,
            pos;
        $(this.tooltipDiv).html('<p class="desc">'+element.label+'<br /><a style="color:'
                                + element.color + '">' + element.header + ': </a>' + element.value + '</p>');
        pos = this.calculateTooltipPosition(top, left);
        $(this.tooltipDiv).css({
            top: pos.top,
            left: pos.left
        }).show();
    };

    Column.prototype.findHoverElement=function(x, y){
        var element, i;
        for(i=0; i<this.elementInfo.elements.length; i++){
            element = this.elementInfo.elements[i];
            if(element.height<0){
                if(x>=element.x && x<(element.x+element.width) && y<element.y && y>=(element.y+element.height))
                    return element;
            } else {
                if(x>=element.x && x<(element.x+element.width) && y>=element.y && y<(element.y+element.height))
                    return element;
            }
        }

        return null;
    };

    Column.prototype.drawRectBar=function (x, y, width, height, color, label, header, value){
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, width, height);
        this.elementInfo.elements.push({
            x: x, y: y, width: width, height: height, color: color, label: label, header: header, value: value
        });
    };
    /*--------- Pie Chart -----------------------------------------------------------*/
    var Pie = function(canvasDiv, width, height, dataSheet, userConfig, defaultConfig){
        BaseChart.call(this, canvasDiv, width, height, dataSheet, userConfig, defaultConfig);
    };
    Pie.prototype = new BaseChart;
    Pie.prototype.constructor = Pie;

    Pie.prototype.showTooltip = function(element){
        var cAngle = (element.start+element.end) / 2;
        var left = this.elementInfo.x+Math.cos(cAngle)*this.elementInfo.radius,
            top = this.elementInfo.y+Math.sin(cAngle)*this.elementInfo.radius,
            pos;
        $(this.tooltipDiv).html('<p class="desc">'+element.label+'<br />'+element.header+': <a style="color:'
            + element.color + '">' + element.value + '</a>(' + element.percentage*100 + '%)</p>');
        top = top - ((top<this.elementInfo.y) ? $(this.tooltipDiv).height() : 0);
        left = left - ((left<this.elementInfo.x) ? $(this.tooltipDiv).width() : 0);
        pos = this.calculateTooltipPosition(top, left);
        $(this.tooltipDiv).css({
            top: pos.top,
            left: pos.left
        }).show();
    };

    Pie.prototype.draw = function(dataSheet, width, height, ctx){
        var titleArea = {
            x: 0, y: 0, width: width, height: this.config.title ? this.config.fontSize * 4 : this.config.fontSize
        };
        var labelArray = $.map(dataSheet.slice(1), function(value){
            return value[0];
        });
        var labelIndicatorWidth = calculateMaxWidth(labelArray, ctx, this.config.fontSize);
        var labelIndicatorArea = {
            x: width-labelIndicatorWidth, y: titleArea.y+titleArea.height,
            width: labelIndicatorWidth, height: height-titleArea.height
        };
        var drawingArea = {
            x: 0, y: titleArea.y+titleArea.height,
            width: width-labelIndicatorArea.width, height: height-titleArea.height
        };

        var colorArray = getColorArray(labelArray.length);

        this.elementInfo.x = drawingArea.x + drawingArea.width / 2;
        this.elementInfo.y = drawingArea.y + drawingArea.height / 2;
        this.elementInfo.radius = Math.min(drawingArea.width, drawingArea.height) / 2 * 0.9;

        var sumValue = 0, i, preValue=0;
        for(i=1; i<dataSheet.length; i++){
            sumValue += dataSheet[i][1];
        }

        ctx.save();
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        for(i=1; i<dataSheet.length; i++){
            this.drawArcs(preValue/sumValue*2*Math.PI, (preValue+dataSheet[i][1])/sumValue*2*Math.PI, colorArray[i-1],
                            dataSheet[0][1], dataSheet[i][0], dataSheet[i][1]);
            preValue += dataSheet[i][1];
        }
        ctx.restore();

        this.drawHeaderIndicator(labelArray, colorArray, labelIndicatorArea);
        this.drawTitle(titleArea);
    };

    Pie.prototype.drawArcs = function(start, end, color, header, label, value){
        this.ctx.beginPath();
        this.ctx.fillStyle = color;
        this.ctx.moveTo(this.elementInfo.x, this.elementInfo.y);
        this.ctx.arc(this.elementInfo.x, this.elementInfo.y, this.elementInfo.radius, start, end, false);
        this.ctx.lineTo(this.elementInfo.x, this.elementInfo.y);
        this.ctx.closePath();
        this.ctx.fill();
        this.elementInfo.elements.push({
            start: start,
            end: end,
            color: color,
            header: header,
            label: label,
            value: value,
            percentage: ((end-start)/(2*Math.PI)).toFixed(2)
        });
    };

    Pie.prototype.findHoverElement = function(x, y){
        var r = Math.sqrt(Math.pow(x-this.elementInfo.x, 2)+Math.pow(y-this.elementInfo.y, 2));
        if(r<=this.elementInfo.radius){
            var angle = Math.atan2(x-this.elementInfo.x, y-this.elementInfo.y);
            angle = Math.PI*0.5 - angle;
            if(angle<0)
                angle = Math.PI*2+angle;
            for(var i=0; i<this.elementInfo.elements.length; i++){
                var arcElement = this.elementInfo.elements[i];
                if(angle>=arcElement.start && angle<arcElement.end)
                    return arcElement;
            }
        }
        return null;
    };

    /*---------------------- Doughnut Chart -----------------------*/
    var Doughnut = function(canvasDiv, width, height, dataSheet, userConfig, defaultConfig){
        BaseChart.call(this, canvasDiv, width, height, dataSheet, userConfig, defaultConfig);
    };
    Doughnut.prototype = new BaseChart;
    Doughnut.prototype.constructor = Doughnut;

    Doughnut.prototype.draw = function(dataSheet, width, height, ctx){
        var titleArea = {
            x: 0, y: 0, width: width, height: this.config.fontSize * (this.config.title ? 4 : 1)
        };
        var labelArray = $.map(dataSheet.slice(1), function(value){
            return value[0];
        });
        var labelIndicatorWidth = calculateMaxWidth(labelArray, ctx, this.config.fontSize);
        var labelIndicatorArea = {
            x: width-labelIndicatorWidth, y: titleArea.y+titleArea.height,
            width: labelIndicatorWidth, height: height-titleArea.height
        };
        var drawingArea = {
            x: 0, y: titleArea.y+titleArea.height,
            width: width-labelIndicatorArea.width, height: height-titleArea.height
        };

        var colorArray = getColorArray(labelArray.length);

        this.elementInfo.x = drawingArea.x + drawingArea.width / 2;
        this.elementInfo.y = drawingArea.y + drawingArea.height / 2;
        this.elementInfo.radius = Math.min(drawingArea.width, drawingArea.height)/2*0.96;
        this.elementInfo.holeRadius = this.elementInfo.radius * this.config.holeRadiusFactor;

        var sumValueArray = [], i, j, preValue = 0, headerArray = dataSheet[0].slice(1),
            radiusStep = (this.elementInfo.radius - this.elementInfo.holeRadius) / headerArray.length,
            endR = this.elementInfo.radius, startR = endR-radiusStep;
        for(i=0; i<headerArray.length; i++){
            preValue = 0;
            for(j=1; j<dataSheet.length; j++){
                preValue += dataSheet[j][i+1];
            }
            sumValueArray.push(preValue);
        }

        ctx.save();
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        for(i=headerArray.length-1; i>=0; i--){
            preValue = 0;
            for(j=1; j<dataSheet.length; j++){
                this.drawArcs(preValue / sumValueArray[i] * 2 * Math.PI,
                    ( preValue + dataSheet[j][i+1] ) / sumValueArray[i] * 2 * Math.PI,
                    startR, endR, colorArray[j-1], headerArray[i], dataSheet[j][0], dataSheet[j][i+1]);
                preValue += dataSheet[j][i+1];
            }
            endR = startR;
            startR -= radiusStep;
        }

        //hole
        ctx.beginPath();
        ctx.moveTo(this.elementInfo.x, this.elementInfo.y);
        ctx.fillStyle = this.config.bgFillColor;
        ctx.arc(this.elementInfo.x, this.elementInfo.y, endR, 0, Math.PI*2, false);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        this.drawHeaderIndicator(labelArray, colorArray, labelIndicatorArea);
        this.drawTitle(titleArea);
    };

    Doughnut.prototype.drawArcs = function(start, end, startR, endR, color, header, label, value){
        var ctx = this.ctx;
        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.moveTo(this.elementInfo.x, this.elementInfo.y);
        ctx.arc(this.elementInfo.x, this.elementInfo.y, endR, start, end, false);
        ctx.lineTo(this.elementInfo.x, this.elementInfo.y);
        ctx.closePath();
        ctx.fill();
        this.elementInfo.elements.push({
            start: start,
            end: end,
            startR: startR,
            endR: endR,
            color: color,
            header: header,
            label: label,
            value: value,
            percentage: ((end-start)/(2*Math.PI)).toFixed(2)
        });
    };

    Doughnut.prototype.findHoverElement = function(x, y){
        var r = Math.sqrt(Math.pow(x-this.elementInfo.x, 2)+Math.pow(y-this.elementInfo.y, 2));
        if(r<=this.elementInfo.radius && r>this.elementInfo.holeRadius){
            var angle = Math.atan2(x-this.elementInfo.x, y-this.elementInfo.y);
            angle = Math.PI*0.5 - angle;
            if(angle<0)
                angle = Math.PI*2+angle;
            for(var i=0; i<this.elementInfo.elements.length; i++){
                var arcElement = this.elementInfo.elements[i];
                if(r>arcElement.endR || r<arcElement.startR)
                    continue;
                if(angle>=arcElement.start && angle<arcElement.end)
                    return arcElement;
            }
        }
        return null;
    };

    Doughnut.prototype.showTooltip = function(element){
        var cAngle = (element.start+element.end) / 2;
        var left = this.elementInfo.x+Math.cos(cAngle)*element.endR,
            top = this.elementInfo.y+Math.sin(cAngle)*element.endR,
            pos;
        $(this.tooltipDiv).html('<p class="desc">'+element.label+'<br />'+element.header+': <a style="color:'
                                + element.color + '">' + element.value + '</a>(' + element.percentage*100 + '%)</p>');
        top = top - ((top<this.elementInfo.y) ? $(this.tooltipDiv).height() : 0);
        left = left - ((left<this.elementInfo.x) ? $(this.tooltipDiv).width() : 0);
        pos = this.calculateTooltipPosition(top, left);
        $(this.tooltipDiv).css({
            top: pos.top,
            left: pos.left
        }).show();
    };
    /*--------------------- Polar Area Chart ---------------------*/
    var PolarArea = function(canvasDiv, width, height, dataSheet, userConfig, defaultConfig){
        if (userConfig && userConfig.circleCount)
            userConfig.circleCount = Math.ceil(userConfig.circleCount/2)*2;
        BaseChart.call(this, canvasDiv, width, height, dataSheet, userConfig, defaultConfig);
    };
    PolarArea.prototype = new BaseChart;
    PolarArea.prototype.constructor = PolarArea;

    PolarArea.prototype.draw = function(dataSheet, width, height, ctx){
        var titleArea = {
            x: 0, y: 0, width: width, height: this.config.fontSize * (this.config.title ? 4 : 1)
        };
        var labelArray = $.map(dataSheet.slice(1), function(value){
            return value[0];
        });
        var labelIndicatorWidth = calculateMaxWidth(labelArray, ctx, this.config.fontSize);
        var labelIndicatorArea = {
            x: width-labelIndicatorWidth, y: titleArea.y+titleArea.height,
            width: labelIndicatorWidth, height: height-titleArea.height
        };
        var drawingArea = {
            x: 0, y: titleArea.y+titleArea.height,
            width: width-labelIndicatorArea.width, height: height-titleArea.height
        };

        var colorArray = getColorArray(labelArray.length);

        this.elementInfo.x = Math.floor(drawingArea.x+drawingArea.width/2)+0.5;
        this.elementInfo.y = Math.floor(drawingArea.y+drawingArea.height/2)+0.5;
        var radius = Math.floor(Math.min(drawingArea.height * 0.9, drawingArea.width*0.9)/2);

        var valueArray = [], i, j;

        for(i=1; i<this.dataSheet.length; i++){
            var data = this.dataSheet[i];
            for(j=1; j<data.length; j++){
                valueArray.push(data[j]);
            }
        }
        var rangeInfo = calculateRange(this.config.circleCount, radius, valueArray, ctx),
            sectionCount = this.dataSheet.length - 1,
            angle = Math.PI * 2 / sectionCount,
            startAngle, endAngle, r;
        ctx.strokeStyle = this.config.circleColor;
        for(i=0; i<this.config.circleCount; i++){
            ctx.beginPath();
            ctx.arc(this.elementInfo.x, this.elementInfo.y, rangeInfo.stepLength*(i+1), 0, Math.PI*2, true);
            ctx.stroke();
        }

        ctx.save();
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        for(i=0; i<sectionCount; i++){
            startAngle = i * angle;
            endAngle = (i+1) * angle;
            r = this.dataSheet[i+1][1]/rangeInfo.stepSize*rangeInfo.stepLength;
            this.elementInfo.elements.push({
                start: startAngle,
                end: endAngle,
                r: r,
                label: this.dataSheet[i+1][0],
                value: this.dataSheet[i+1][1],
                color: colorArray[i]
            });
            ctx.fillStyle = colorArray[i];
            ctx.beginPath();
            ctx.arc(this.elementInfo.x, this.elementInfo.y, r, startAngle, endAngle, false);
            ctx.lineTo(this.elementInfo.x, this.elementInfo.y);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();

        this.drawHeaderIndicator(labelArray, colorArray, labelIndicatorArea);
        this.drawTitle(titleArea);
    };

    PolarArea.prototype.showTooltip = function(element){
        var cAngle = (element.start+element.end) / 2;
        var left = this.elementInfo.x+Math.cos(cAngle)*element.r,
            top = this.elementInfo.y+Math.sin(cAngle)*element.r,
            pos;
        $(this.tooltipDiv).html('<p class="desc">'+element.label+'<br /><a style="color:'
                                    + element.color + '">' + element.value + '</a></p>');
        top = top - ((top<this.elementInfo.y) ? $(this.tooltipDiv).height() : 0);
        left = left - ((left<this.elementInfo.x) ? $(this.tooltipDiv).width() : 0);
        pos = this.calculateTooltipPosition(top, left);
        $(this.tooltipDiv).css({
            top: pos.top,
            left: pos.left
        }).show();
    };

    PolarArea.prototype.findHoverElement = function(x, y){
        var r = Math.sqrt(Math.pow(x-this.elementInfo.x, 2)+Math.pow(y-this.elementInfo.y, 2));
        var angle = Math.atan2(x-this.elementInfo.x, y-this.elementInfo.y);
        angle = Math.PI*0.5 - angle;
        if(angle<0)
            angle = Math.PI*2+angle;
        for(var i=0; i<this.elementInfo.elements.length; i++){
            var arcElement = this.elementInfo.elements[i];
            if(arcElement.r>r && angle>=arcElement.start && angle<arcElement.end)
                return arcElement;
        }
        return null;
    };

    var Line = function(canvasDiv, width, height, dataSheet, userConfig, defaultConfig){
        BaseGridLineChart.call(this, canvasDiv, width, height, dataSheet, userConfig, defaultConfig);
    };
    Line.prototype = new BaseGridLineChart;
    Line.prototype.constructor = Line;

    Line.prototype.draw = function(dataSheet, width, height, ctx){
        //calculate drawing area
        var labelHeight = this.config.fontSize * 2;
        var labelArea = {
            x: 0, y: height - labelHeight, width: width, height: labelHeight
        };
        var titleArea = {
            x: 0, y: 0, width: width, height: this.config.fontSize * (this.config.title ? 4 : 1)
        };
        var rangeInfo = this.calculateRange(height-titleArea.height-labelArea.height);
        var valueRangeArea = {
            x: 0, y:titleArea.y+titleArea.height,
            width: rangeInfo.rangeTextWidth, height: height - labelArea.height - titleArea.height
        };
        var headerIndicatorWidth = calculateMaxWidth(dataSheet[0].slice(1), ctx, this.config.fontSize);
        var headerIndicatorArea = {
            x:width-headerIndicatorWidth, y: titleArea.y+titleArea.height,
            width: headerIndicatorWidth, height: height - labelArea.height - titleArea.height
        };
        var drawingArea = {
            x: valueRangeArea.x+valueRangeArea.width, y: titleArea.y+titleArea.height,
            width: width-valueRangeArea.width-headerIndicatorArea.width,
            height: height-valueRangeArea.height-titleArea.height
        };

        //draw value range area and grid line
        var zeroY = 0;
        ctx.beginPath();
        ctx.strokeStyle = this.config.gridStrokeColor;
        for(var i=0; i<=this.config.numberCoordinateCount; i++){
            var value = rangeInfo.start + i*rangeInfo.stepSize;
            var y = valueRangeArea.y+valueRangeArea.height-i*rangeInfo.stepLength + 0.5;//0.5 anti-aliasing
            if(value==0){
                zeroY = y;
            } else {
                ctx.moveTo(drawingArea.x, Math.floor(y)+0.5);
                ctx.lineTo(drawingArea.x+drawingArea.width, Math.floor(y)+0.5);
            }
            ctx.fillStyle = this.config.fontColor;
            ctx.fillText(value.toFixed(rangeInfo.stepFix), valueRangeArea.x, y+this.config.fontSize/2);
        }
        ctx.stroke();
        ctx.beginPath();
        ctx.fillStyle = "#000";
        ctx.strokeStyle = "#000";
        ctx.moveTo(drawingArea.x, Math.floor(zeroY)+0.5);
        ctx.lineTo(drawingArea.x+drawingArea.width, Math.floor(zeroY)+0.5);
        ctx.stroke();

        var isLineArea = this.config.type!==undefined && this.config.type.toLowerCase()=="area",
            sectionCount = dataSheet.length - 1,
            sectionWidth = drawingArea.width/(sectionCount - (isLineArea ? 1 : 0)),
            colorArray = getColorArray(sectionCount),
            rgbaColorArray = getRGBAColorArray(sectionCount);
        //draw labels
        ctx.fillStyle = this.config.fontColor;
        for(i=1; i<dataSheet.length; i++){
            ctx.fillText(dataSheet[i][0],
                drawingArea.x+(i-0.5)*sectionWidth-ctx.measureText(dataSheet[i][0]).width/2,
                labelArea.y+labelArea.height*0.75);
        }
        var dotArray, j, color;
        for(i=1; i<=sectionCount; i++){
            dotArray = [];
            j= 0;
            color=colorArray[i-1];
            for(j=1; j<dataSheet.length; j++){
                dotArray.push({
                    x : drawingArea.x+j*sectionWidth - (isLineArea ? 1 : 0.5)*sectionWidth,
                    y : zeroY-rangeInfo.stepLength/rangeInfo.stepSize*dataSheet[j][i],
                    label: dataSheet[j][0],
                    header: dataSheet[0][i],
                    value: dataSheet[j][i]
                });
            }
            for(j=0; j<dotArray.length; j++){
                this.saveDotElementPos(dotArray[j].x, dotArray[j].y, this.config.circleRadius, color,
                    dotArray[j].label, dotArray[j].header, dotArray[j].value);
            }
            if(isLineArea){
                ctx.save();
                ctx.beginPath();
                ctx.fillStyle = rgbaColorArray[i-1];
                var dot = dotArray[0];
                ctx.moveTo(dot.x, zeroY);
                for(j=0; j<dotArray.length; j++){
                    dot = dotArray[j];
                    ctx.lineTo(dot.x, dot.y)
                }
                ctx.lineTo(dot.x, zeroY);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }
            ctx.beginPath();
            ctx.fillStyle = color;
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            for(j=1; j<dotArray.length; j++){
                ctx.moveTo(dotArray[j-1].x, dotArray[j-1].y);
                ctx.lineTo(dotArray[j].x, dotArray[j].y)
            }
            ctx.stroke();
        }

        this.drawHeaderIndicator(dataSheet[0].slice(1), colorArray, headerIndicatorArea);
        this.drawTitle(titleArea);
    };

    Line.prototype.saveDotElementPos = function(x, y, r, color, label, header, value){
        this.elementInfo.elements.push({
            x: x, y: y, r: r, color: color,
            label: label, header: header, value: value
        });
    };

    Line.prototype.findHoverElement = function(x, y){
        var r, dot;
        for(var i=0; i<this.elementInfo.elements.length; i++){
            dot = this.elementInfo.elements[i];
            r = Math.sqrt(Math.pow(dot.x-x, 2)+Math.pow(dot.y-y, 2));
            if(r<dot.r*1.5)
                return dot;
        }
        return null;
    };

    Line.prototype.showTooltip = function(element){
        $(this.tooltipDiv).html('<p class="desc">'+element.label+'<br /><a style="color:'
                                + element.color + '">' + element.header + ': </a>' + element.value + '</p>');
        var top = element.y - $(this.tooltipDiv).height() - this.config.circleRadius * 2,
            left = element.x - $(this.tooltipDiv).width() / 2,
            pos = this.calculateTooltipPosition(top, left);
        $(this.tooltipDiv).css({
            top: pos.top,
            left: pos.left
        }).show();
    };
    //----------------------------------- Radar Chart -------------------------------
    var Radar = function(canvasDiv, width, height, dataSheet, userConfig, defaultConfig){
        BaseChart.call(this, canvasDiv, width, height, dataSheet, userConfig, defaultConfig);
    };
    Radar.prototype = new BaseChart;
    Radar.prototype.constructor = Radar;

    Radar.prototype.showTooltip = function(element){
        $(this.tooltipDiv).html('<p class="desc">'+element.label+'<br /><a style="color:'
                                + element.color + '">' + element.property + ': </a>' + element.value + '</p>');
        var top = element.y - this.config.lineWidth* 8,
            left = element.x - $(this.tooltipDiv).width()-10,
            pos = this.calculateTooltipPosition(top, left);
        $(this.tooltipDiv).css({
            top: pos.top,
            left: pos.left
        }).show();
    };

    Radar.prototype.draw = function(dataSheet, width, height, ctx){
        var titleArea = {
            x: 0, y: 0, width: width, height: this.config.fontSize * (this.config.title ? 4 : 1)
        };
        var labelArray = $.map(dataSheet.slice(1), function(value){
            return value[0];
        });
        var labelIndicatorWidth = calculateMaxWidth(labelArray, ctx, this.config.fontSize);
        var labelIndicatorArea = {
            x: width-labelIndicatorWidth, y: titleArea.y+titleArea.height,
            width: labelIndicatorWidth, height: height-titleArea.height
        };
        var drawingArea = {
            x: 0, y:titleArea.y+titleArea.height,
            width: width-labelIndicatorArea.width, height: height-titleArea.height
        };
        var propertyArray = dataSheet[0].slice(1);
        var propertyWidth = calculateMaxWidth(propertyArray, ctx, this.config.fontSize);
        //draw radar line
        var x=Math.floor(drawingArea.x+drawingArea.width/2)+0.5,
            y=Math.floor(drawingArea.y+drawingArea.height/2)+0.5,
            r=Math.min(drawingArea.width-2*propertyWidth, drawingArea.height-3*this.config.fontSize)/2,
            i, j, tX, tY, curAngle,
            propertyCount = propertyArray.length,
            angle = Math.PI*2/propertyCount,
            angleOffset = Math.PI/2;

        ctx.strokeStyle = this.config.webGridStrokeColor;
        ctx.fillStyle = "#000";
        for(i=0; i<propertyCount; i++){
            ctx.moveTo(x, y);
            curAngle = i * angle - angleOffset;
            tX = Math.floor(Math.cos(curAngle)*r+x)+0.5;
            tY = Math.floor(Math.sin(curAngle)*r+y)+0.5;
            ctx.lineTo(tX, tY);
            if(tX>x){
                ctx.textAlign = 'left';
            } else if (tX<x){
                ctx.textAlign = 'right';
            } else {
                ctx.textAlign = 'center';
            }
            ctx.fillText(propertyArray[i], tX, tY);
        }
        ctx.stroke();
        ctx.textAlign = 'left';

        var valueArray = [], len, rangeInfo, data;
        for(i=1; i<this.dataSheet.length; i++){
            data = this.dataSheet[i];
            for(j=1; j<data.length; j++){
                valueArray.push(data[j]);
            }
        }
        rangeInfo = calculateRange(this.config.webGridCount, r-this.config.fontSize, valueArray, ctx);
        for(i=0; i<this.config.webGridCount; i++){
            len = rangeInfo.stepLength * (i + 1);
            for(j=0; j<propertyCount; j++){
                ctx.moveTo(Math.floor(Math.cos(j*angle-angleOffset)*len+x)+0.5,
                           Math.floor(Math.sin(j*angle-angleOffset)*len+y)+0.5);
                ctx.lineTo(Math.floor(Math.cos((j+1)*angle-angleOffset)*len+x)+0.5,
                           Math.floor(Math.sin((j+1)*angle-angleOffset)*len+y)+0.5);
            }

        }
        ctx.stroke();

        var colorArray = getColorArray(labelArray.length),
            posArray;
        ctx.lineWidth = this.config.lineWidth;
        for(i=1; i<this.dataSheet.length; i++){
            data = this.dataSheet[i];
            ctx.strokeStyle = colorArray[i-1];
            ctx.beginPath();
            posArray = this.calculateNodePos(this.dataSheet[i].slice(1), rangeInfo, angle, angleOffset, x, y,
                                            colorArray[i-1], data[0], propertyArray);
            for(j=0; j<posArray.length-1; j++){
                ctx.moveTo(posArray[j].x, posArray[j].y);
                ctx.lineTo(posArray[j+1].x, posArray[j+1].y)
            }
            ctx.moveTo(posArray[posArray.length-1].x, posArray[posArray.length-1].y);
            ctx.lineTo(posArray[0].x, posArray[0].y);
            ctx.stroke();
        }

        this.drawHeaderIndicator(labelArray, colorArray, labelIndicatorArea);
        this.drawTitle(titleArea);
    };

    Radar.prototype.calculateNodePos = function(valueArray, rangeInfo, angle, angleOffset, xOffset, yOffset,
                                                color, label, propertyArray){
        var result = [], x, y, len;
        for(var i=0; i<valueArray.length; i++){
            len = rangeInfo.stepLength*valueArray[i]/rangeInfo.stepSize;
            x = Math.floor( Math.cos( i * angle - angleOffset ) * len + xOffset ) + 0.5;
            y = Math.floor( Math.sin( i * angle - angleOffset ) * len + yOffset ) + 0.5;
            result.push({ x: x, y: y });
            this.elementInfo.elements.push({
                x: x, y: y, color: color, label: label, property: propertyArray[i], value: valueArray[i]
            });
        }
        return result;
    };

    Radar.prototype.findHoverElement=function(x, y){
        var rRange = this.config.lineWidth * 4, node, r;
        for(var i=0; i<this.elementInfo.elements.length; i++){
            node = this.elementInfo.elements[i];
            r = Math.sqrt( Math.pow(node.x - x, 2) + Math.pow(node.y - y, 2));
            if(r<=rRange)
                return node;
        }
        return null;
    };
    /*----------- Util Function ------------------------------*/
    function calculateStepSize(value, numberCoordinateCount){
        var step = Math.abs(value/numberCoordinateCount);
        var result = {
            stepSize: 0,
            decimalFix: 0
        };
        if(step==0)
            return result;
        if(step<1){
            //0.12 -> 0.2; 0.0123 ->0.02
            function ceilDecimal(v){
                v = v * 10;
                result.decimalFix++;
                if(v>1)
                    return Math.ceil(v)/10;
                else
                    return ceilDecimal(v)/10
            }
            result.stepSize = ceilDecimal(step);
        } else if(step<5) {
            result.stepSize = Math.ceil(step);
        } else {
            //222 -> 100; 2222 -> 1000
            function floorNumber(n){
                if(n/10<10)
                    return 10;
                else
                    return floorNumber(n/10) * 10;
            }

            var rs = floorNumber(step) / 2;
            step = Math.ceil(step/rs) * rs;//= rs * N
            result.stepSize = step;
        }
        return result;
    }
    function mergeConfig(defaultConfig, userDefinedConfig){
        return $.extend({}, defaultConfig, userDefinedConfig);
    }
    function rainbow(numOfSteps, step) {
        // This function generates vibrant, "evenly spaced" colours (i.e. no clustering).
        // This is ideal for creating easily distinguishable vibrant markers in Google Maps and other apps.
        // Adam Cole, 2011-Sept-14
        // HSV to RBG adapted from:
        // http://mjijackson.com/2008/02/rgb-to-hsl-and-rgb-to-hsv-color-model-conversion-algorithms-in-javascript
        var r, g, b;
        var h = step / numOfSteps;
        var i = ~~(h * 6);
        var f = h * 6 - i;
        var q = 1 - f;
        switch(i % 6){
            case 0: r = 1; g = f; b = 0; break;
            case 1: r = q; g = 1; b = 0; break;
            case 2: r = 0; g = 1; b = f; break;
            case 3: r = 0; g = q; b = 1; break;
            case 4: r = f; g = 0; b = 1; break;
            case 5: r = 1; g = 0; b = q; break;
        }
        var c = "#" + ("00" + (~ ~(r * 255)).toString(16)).slice(-2) + ("00" + (~ ~(g * 255)).toString(16)).slice(-2)
            + ("00" + (~ ~(b * 255)).toString(16)).slice(-2);
        return (c);
    }

    function rgb2rgba(colorArray, alpha){
        var result = [], color;
        for(var i=0; i<colorArray.length; i++){
            color = colorArray[i];
            result.push("rgba(" + parseInt(color.substr(1,2), 16) + "," + parseInt(color.substr(3,2), 16) + "," +
                parseInt(color.substr(5,2), 16) + "," + alpha + ")");
        }
        return result;
    }

    var COLOR_ARRAY = ["#3366CC", "#DC3912", "#FF9900", "#109618", "#990099", "#0099C6", "DD4477", "#66AA00",
                        "#B82E2E", "#316395", "#994499", "#22AA99", "#AAAA11", "#6633CC", "#E67300"];
    var ALPHA_COLOR_ARRAY = rgb2rgba(COLOR_ARRAY, 0.5);

    function getColorArray(arrayLength){
        if(arrayLength<=COLOR_ARRAY.length){
            return COLOR_ARRAY.slice(0, arrayLength);
        }
        var colorArray = [];
        for(var i=0; i<arrayLength; i++){
            colorArray.push(rainbow(arrayLength, i));
        }
        return colorArray;
    }

    function getRGBAColorArray(arrayLength){
        if(arrayLength<=ALPHA_COLOR_ARRAY.length){
            return ALPHA_COLOR_ARRAY.slice(0, arrayLength);
        }
        var colorArray = [];
        for(var i=0; i<arrayLength; i++){
            colorArray.push(rainbow(arrayLength, i));
        }
        return rgb2rgba(colorArray, 0.5);
    }

    function calculateMaxWidth(headersArray, context, fontSize){
        //escape first header
        var maxWidth = 0;
        for(var i=0; i<headersArray.length; i++){
            var w = context.measureText(headersArray[i]+"XX").width;
            if(w>maxWidth)
                maxWidth = w;
        }
        return maxWidth + fontSize;
    }

    function calculateRange (stepCount, sumLength, valueArray, ctx){
        var start, end, stepInfo, stepLength, minValue, maxValue, rangeTextWidth;

        minValue = Math.min.apply(Math, valueArray);
        maxValue = Math.max.apply(Math, valueArray);
        if(minValue>0){//all positive value
            stepInfo = calculateStepSize(maxValue, stepCount);
            end = stepInfo.stepSize * stepCount;
            start = 0;
            rangeTextWidth = ctx.measureText(end.toFixed(stepInfo.decimalFix)+"XX").width;
        } else if(maxValue<0){//all negative value
            end = 0;
            stepInfo = calculateStepSize(minValue, stepCount);
            start = -stepInfo.stepSize * stepCount;
            rangeTextWidth = ctx.measureText(start.toFixed(stepInfo.decimalFix)+"XX").width;
        } else {
            stepInfo = calculateStepSize(Math.max(Math.abs(minValue), maxValue), stepCount/2);
            end = stepInfo.stepSize * stepCount/2;
            start = -end;
            rangeTextWidth = ctx.measureText(start.toFixed(stepInfo.decimalFix)+"XX").width;
        }
        stepLength = sumLength / stepCount;

        return {
            start: start,
            end: end,
            stepSize: stepInfo.stepSize,
            stepFix: stepInfo.decimalFix,
            stepLength: stepLength,
            rangeTextWidth: rangeTextWidth
        };
    }

    /*---------------------------- Define Chart -----------------------------------*/
    function newChart(Chart, defaultConfig){
        function chart(dataSheet, config){
            this.each(function(index, canvasDiv){
                new Chart(canvasDiv, $(this).width(), $(this).height(), dataSheet, config, defaultConfig);
            });
        }
        return chart;
    }

    $.extend($.fn, {
        Bar: newChart(Bar, defaultBarConfig),
        Column: newChart(Column, defaultBarConfig),
        Pie: newChart(Pie, defaultPieConfig),
        Line: newChart(Line, defaultLineConfig),
        Radar: newChart(Radar, defaultRadarConfig),
        PolarArea: newChart(PolarArea, defaultPolarAreaConfig),
        Doughnut: newChart(Doughnut, defaultDoughnutConfig)
    });
})(jQuery);