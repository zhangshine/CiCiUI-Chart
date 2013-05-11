./node_modules/.bin/uglifyjs -nc ./js/jquery.ciciui-chart.js > ./js/ciciui-chart.tmp.js
cat ./misc/license-header.in > ./js/ciciui-chart.copyright.js
cat ./js/ciciui-chart.copyright.js ./js/ciciui-chart.tmp.js > ./js/jquery.ciciui-chart.min.js
rm ./js/ciciui-chart.copyright.js
rm ./js/ciciui-chart.tmp.js
