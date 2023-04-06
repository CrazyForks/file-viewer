import $ from 'jquery'
import { format } from 'd3'
import bb, { area, bar, line, pie, scatter } from 'billboard.js'
import 'billboard.js/dist/theme/insight.css'

/**
 * 显示图表
 */
export const displayChart = charts => {
  processMsgQueue(charts.MsgQueue)
  setNumericBullets($('.block'))
  setNumericBullets($('table td'))
}

function processMsgQueue(queue) {
  queue.forEach(queue => processSingleMsg(queue?.data))
}

const generalAxis = (data, cb = a => a) => {
  const modifier = data => {
    cb(data)
    return data
  }
  return {
    axis: modifier({
      x: {
        tick: {
          format(index) {
            return data[0].xlabels[index] || index
          }
        }
      }
    })
  }
}

const buildScatterData = data => {
  return data.reduce((result, item, index) => {
    result
  }, [])
}

function processSingleMsg(d) {
  if (!d) return

  const chartID = d.chartID
  const chartType = d.chartType
  const chartData = d.chartData
  const chart = {
    bindto: `#${chartID}`
  }
  switch (chartType) {
    case 'lineChart':
      Object.assign(chart, {
        data: {
          columns: chartData.map(c => [c.key, ...c.values.map(({ y }) => y)]),
          type: line()
        },
        ...generalAxis(chartData),
        interaction: { enabled: true }
      })
      break
    case 'barChart':
      Object.assign(chart, {
        data: {
          columns: chartData.map(c => [c.key, ...c.values.map(({ y }) => y)]),
          type: bar()
        },
        ...generalAxis(chartData, axis => axis.x.tick.multiline = true)
      })
      break
    case 'pieChart':
    case 'pie3DChart':
      Object.assign(chart, {
        data: {
          columns: Object.values(chartData[0].xlabels).map((v, i) => [v, chartData[0].values[i].y]),
          type: pie()
        }
      })
      break
    case 'areaChart':
      Object.assign(chart, {
        data: {
          columns: chartData.map(c => [c.key, ...c.values.map(({ y }) => y)]),
          type: area()
        },
        interaction: { enabled: true },
        ...generalAxis(chartData)
      })
      break
    case 'scatterChart':
      Object.assign(chart, {
        data: {
          xs: {
            y: 'x'
          },
          columns: chartData.map((c, i) => [i ? 'y' : 'x', ...c]),
          type: scatter()
        },
        axis: {
          x: {
            label: 'X',
            showDist: true,
            tick: {
              format: format('.02f')
            }
          },
          y: {
            label: 'Y',
            showDist: true,
            tick: {
              format: format('.02f')
            }
          }
        }
      })
      break
    default:
  }
  if (chart.data) {
    bb.generate(chart)
  }
}

function setNumericBullets(elem) {
  var prgrphs_arry = elem
  for (var i = 0; i < prgrphs_arry.length; i++) {
    var buSpan = $(prgrphs_arry[i]).find('.numeric-bullet-style')
    if (buSpan.length > 0) {
      //console.log("DIV-"+i+":");
      var prevBultTyp = ''
      var prevBultLvl = ''
      var buletIndex = 0
      var tmpArry = new Array()
      var tmpArryIndx = 0
      var buletTypSrry = new Array()
      for (var j = 0; j < buSpan.length; j++) {
        var bult_typ = $(buSpan[j]).data('bulltname')
        var bult_lvl = $(buSpan[j]).data('bulltlvl')
        //console.log(j+" - "+bult_typ+" lvl: "+bult_lvl );
        if (buletIndex == 0) {
          prevBultTyp = bult_typ
          prevBultLvl = bult_lvl
          tmpArry[tmpArryIndx] = buletIndex
          buletTypSrry[tmpArryIndx] = bult_typ
          buletIndex++
        } else {
          if (bult_typ == prevBultTyp && bult_lvl == prevBultLvl) {
            prevBultTyp = bult_typ
            prevBultLvl = bult_lvl
            buletIndex++
            tmpArry[tmpArryIndx] = buletIndex
            buletTypSrry[tmpArryIndx] = bult_typ
          } else if (bult_typ != prevBultTyp && bult_lvl == prevBultLvl) {
            prevBultTyp = bult_typ
            prevBultLvl = bult_lvl
            tmpArryIndx++
            tmpArry[tmpArryIndx] = buletIndex
            buletTypSrry[tmpArryIndx] = bult_typ
            buletIndex = 1
          } else if (bult_typ != prevBultTyp && Number(bult_lvl) > Number(prevBultLvl)) {
            prevBultTyp = bult_typ
            prevBultLvl = bult_lvl
            tmpArryIndx++
            tmpArry[tmpArryIndx] = buletIndex
            buletTypSrry[tmpArryIndx] = bult_typ
            buletIndex = 1
          } else if (bult_typ != prevBultTyp && Number(bult_lvl) < Number(prevBultLvl)) {
            prevBultTyp = bult_typ
            prevBultLvl = bult_lvl
            tmpArryIndx--
            buletIndex = tmpArry[tmpArryIndx] + 1
          }
        }
        //console.log(buletTypSrry[tmpArryIndx]+" - "+buletIndex);
        var numIdx = getNumTypeNum(buletTypSrry[tmpArryIndx], buletIndex)
        $(buSpan[j]).html(numIdx)
      }
    }
  }
}

function getNumTypeNum(numTyp, num) {
  var rtrnNum = ''
  switch (numTyp) {
    case 'arabicPeriod':
      rtrnNum = num + '. '
      break
    case 'arabicParenR':
      rtrnNum = num + ') '
      break
    case 'alphaLcParenR':
      rtrnNum = alphaNumeric(num, 'lowerCase') + ') '
      break
    case 'alphaLcPeriod':
      rtrnNum = alphaNumeric(num, 'lowerCase') + '. '
      break

    case 'alphaUcParenR':
      rtrnNum = alphaNumeric(num, 'upperCase') + ') '
      break
    case 'alphaUcPeriod':
      rtrnNum = alphaNumeric(num, 'upperCase') + '. '
      break

    case 'romanUcPeriod':
      rtrnNum = romanize(num) + '. '
      break
    case 'romanLcParenR':
      rtrnNum = romanize(num) + ') '
      break
    case 'hebrew2Minus':
      rtrnNum = hebrew2Minus.format(num) + '-'
      break
    default:
      rtrnNum = num
  }
  return rtrnNum
}

function romanize(num) {
  if (!+num)
    return false
  var digits = String(+num).split(''),
    key = ['', 'C', 'CC', 'CCC', 'CD', 'D', 'DC', 'DCC', 'DCCC', 'CM',
      '', 'X', 'XX', 'XXX', 'XL', 'L', 'LX', 'LXX', 'LXXX', 'XC',
      '', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'],
    roman = '',
    i = 3
  while (i--)
    roman = (key[+digits.pop() + (i * 10)] || '') + roman
  return Array(+digits.join('') + 1).join('M') + roman
}

var hebrew2Minus = archaicNumbers([
  [1000, ''],
  [400, 'ת'],
  [300, 'ש'],
  [200, 'ר'],
  [100, 'ק'],
  [90, 'צ'],
  [80, 'פ'],
  [70, 'ע'],
  [60, 'ס'],
  [50, 'נ'],
  [40, 'מ'],
  [30, 'ל'],
  [20, 'כ'],
  [10, 'י'],
  [9, 'ט'],
  [8, 'ח'],
  [7, 'ז'],
  [6, 'ו'],
  [5, 'ה'],
  [4, 'ד'],
  [3, 'ג'],
  [2, 'ב'],
  [1, 'א'],
  [/יה/, 'ט״ו'],
  [/יו/, 'ט״ז'],
  [/([א-ת])([א-ת])$/, '$1״$2'],
  [/^([א-ת])$/, '$1׳']
])

function archaicNumbers(arr) {
  // eslint-disable-next-line no-unused-vars
  var arrParse = arr.slice().sort(function(a, b) {
    return b[1].length - a[1].length
  })
  return {
    format: function(n) {
      var ret = ''
      $.each(arr, function() {
        var num = this[0]
        if (parseInt(num) > 0) {
          for (; n >= num; n -= num) ret += this[1]
        } else {
          ret = ret.replace(num, this[1])
        }
      })
      return ret
    }
  }
}

function alphaNumeric(num, upperLower) {
  num = Number(num) - 1
  var aNum = ''
  if (upperLower == 'upperCase') {
    aNum = (((num / 26 >= 1) ? String.fromCharCode(num / 26 + 64) : '') + String.fromCharCode(num % 26 + 65)).toUpperCase()
  } else if (upperLower == 'lowerCase') {
    aNum = (((num / 26 >= 1) ? String.fromCharCode(num / 26 + 64) : '') + String.fromCharCode(num % 26 + 65)).toLowerCase()
  }
  return aNum
}
