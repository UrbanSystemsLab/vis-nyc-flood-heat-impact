/* global mapboxgl d3 */
$(function() {
	mapboxgl.accessToken = 'pk.eyJ1IjoidGltb25tIiwiYSI6ImNpeGdsM3J3czAwMmMyb3BxNDhpOWY2cDMifQ.fGcwulOfy5N9AtD05ehH_A'
	var map
	var style

	// Layers
	var grayBuildingsLayerMN, grayBuildingsLayerNotMN
	var heatRiskLayer
	var floodRiskLayer
	var incomeLayer
	var ageLayer
	var ethnicWhite, ethnicAsian, ethnicAfAm, ethnicHisp
	var dens2010, dens2020, dens2030, dens2040, dens2050, dens2060, dens2070, dens2080

	var visibleLayers = []
	var ethnicColors = ['#8dd3c7', '#bebada', '#ffffb3', '#fb8072']
	var floodColors = ['#333', '#9ecae1', '#6baed6', '#4292c6', '#2171b5', '#08306b']
	var floodStops = [0, 1, 2, 3, 4, 5]
	var heatColors = ['#333', '#fee0d2', '#fc9272', '#de2d26']
	var heatStops = [0.45, 0.47, 0.49, 0.51]
	var incomeColors = ['#333', '#e5f5f9', '#99d8c9', '#2ca25f']
	var incomeStops = [0, 0.1, 0.2, 0.3]
	var ageColors = ['#333', '#fff7f3', '#fde0dd', '#fcc5c0', '#fa9fb5', '#f768a1', '#dd3497', '#ae017e', '#7a0177', '#49006a']
	var ageStops = [0, 0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08, 0.09]
	// var densColors = ['#333', '#fee0d2', '#fc9272', '#de2d26']
	// var densStops = [0, 0.004, 0.005, 0.009]

	$.getJSON('map-style/style.json', function(data) {
		style = data
		createAllLayers()
		addAllLayers()

		map = new mapboxgl.Map({
			container: 'map',
			style: style,
			center: [-73.986, 40.740],
			zoom: 15.1,
			pitch: 50,
			bearing: -20
		})
		map.on('load', function() {
			map.addLayer({
				'id': '3d-buildings',
				'source': 'composite',
				'source-layer': 'buildingsgeojson',
				'filter': ['has', 'height'],
				'type': 'fill-extrusion',
				'paint': {
					'fill-extrusion-color': '#aaa',
					'fill-extrusion-height': {
						'type': 'identity',
						'property': 'height'
					},
					'fill-extrusion-base': {
						'type': 'identity',
						'property': 'min_height'
					},
					'fill-extrusion-opacity': 0.6
				}
			})
			visibleLayers.push('3d-buildings')
		})
	})

	// Load Legend
	addCategoricalLegend('#legend-flood', floodColors, ['Null', 'Zone 1', 'Zone 2', 'Zone 3', 'Zone 4', 'Zone 5'])
	addCategoricalLegend('#legend-ethnicity', ethnicColors, ['White', 'Asian', 'Hispanic', 'African-American'])
	addContinuousLegend('#legend-heat', heatColors)
	addContinuousLegend('#legend-age', ageColors)
	addContinuousLegend('#legend-income', incomeColors)
	$('.legend').fadeOut('fast')
	setTimeout(function() {
		$('#legend-none').fadeTo('slow', 0.9)
	}, 500)

	// Data Attribute selector
	$('input[type=radio][name=data-attrs]').change(function() {
		switch (this.value) {
			case 'none':
				// Grey Buildings
				fadeLayers(visibleLayers, ['3d-buildings'])
				showLegend('#legend-none')

				break
			case 'flood':
				fadeLayers(visibleLayers, ['floodRiskLayer'])
				showLegend('#legend-flood')

				break
			case 'heat':
				fadeLayers(visibleLayers, ['heatRiskLayer'])
				showLegend('#legend-heat')

				break
			case 'ethnicity':
				fadeLayers(visibleLayers, ['ethnicWhite', 'ethnicAsian', 'ethnicHisp', 'ethnicAfAm'])
				showLegend('#legend-ethnicity')

				break
			case 'age':
				fadeLayers(visibleLayers, ['ageLayer'])
				showLegend('#legend-age')

				break
			case 'income':
				fadeLayers(visibleLayers, ['incomeLayer'])
				showLegend('#legend-income')

				break
			default:
				fadeLayers(visibleLayers, ['3d-buildings'])
				showLegend('#legend-none')
		}
	})

	function fadeLayers(fadeOut, fadeIn) {
		fadeIn.forEach(function(layerName) {
			var opacity = 0
			map.setLayoutProperty(layerName, 'visibility', 'visible')
			map.setPaintProperty(layerName, 'fill-extrusion-opacity', 0)
			setTimeout(function() {
				var fadeIn = setInterval(function() {
					map.setPaintProperty(layerName, 'fill-extrusion-opacity', opacity)
					opacity = opacity + 0.08
					if (opacity > 0.8) {
						clearInterval(fadeIn)
					}
				}, 200)
			}, 200)
		})

		setTimeout(function() {
			// Fade out layers and remove from visibleLayers Array. Then add FadeIn layers to visibleLayers
			fadeOut.forEach(function(layerName) {
				var opacity = parseFloat(map.getPaintProperty(layerName, 'fill-extrusion-opacity'))
				var fadeOut = setInterval(function() {
					map.setPaintProperty(layerName, 'fill-extrusion-opacity', opacity)
					opacity = opacity - 0.08
					if (opacity < 0) {
						map.setLayoutProperty(layerName, 'visibility', 'none')
						clearInterval(fadeOut)
					}
				}, 200)

				visibleLayers = visibleLayers.filter(function(item) {
					return item !== layerName
				})
			})

			fadeIn.forEach(function(layerName) {
				visibleLayers.push(layerName)
			})
		}, 200)
	}

	function addContinuousLegend(legendId, colors) {
		var gradient = colors.slice()
		gradient.splice(0, 1)

		if (colors !== null) {
			var colorScale = d3.scale.linear().range(gradient)
			var svgW = 180
			var svgH = 60
			var barW = 180
			var barH = 10

			var key = d3.select(legendId).append('svg').attr('width', svgW).attr('height', svgH)
			var legend = key.append('defs').append('svg:linearGradient').attr('id', legendId)
			legend.selectAll('stop')
				.data(colorScale.range())
				.enter().append('stop')
				.attr('offset', function(d, i) {
					return i / (colorScale.range().length - 1)
				})
				.attr('stop-color', function(d) {
					return d
				})

			key.append('rect')
				.attr('width', barW)
				.attr('height', barH)
				.style('fill', 'url(#' + legendId + ')')
				.attr('y', '20px')

			var minLabel = key.append('text')
				.attr('x', (0))
				.attr('y', (50))
				.attr('text-anchor', 'start')
				.text('Low')

			var maxLabel = key.append('text')
				.attr('x', (barW))
				.attr('y', (50))
				.attr('text-anchor', 'end')
				.text('High')
		}
	}

	function addCategoricalLegend(legendId, colors, labels) {

		if (colors !== null) {
			var svgW = 300
			var svgH = colors.length * 35
			var barW = 60
			var barH = 20

			var key = d3.select(legendId).append('svg').attr('width', svgW).attr('height', svgH)
			for (var i = 0; i < colors.length; i++) {
				key.append('rect')
					.attr('width', barW)
					.attr('height', barH)
					.style('fill', colors[i])
					.attr('x', 10)
					.attr('y', 30 * i + 20)

				key.append('text')
					.attr('x', barW + 30)
					.attr('y', 30 * i + 35)
					.attr('text-anchor', 'start')
					.text(labels[i])
			}
		}
	}

	function showLegend(legendId) {
		$('.legend').fadeOut()
		$(legendId).fadeTo('slow', 1)
	}

	function createAllLayers() {
		// HEATRISK
		heatRiskLayer = {
			'id': 'heatRiskLayer',
			'type': 'fill-extrusion',
			'source': 'composite',
			'source-layer': 'buildingsgeojson',
			'filter': ['has', 'heat_risk'],
			'layout': { 'visibility': 'none' },
			'paint': {
				'fill-extrusion-color': {
					'property': 'heat_risk',
					'stops': [
						[heatStops[0], heatColors[0]],
						[heatStops[1], heatColors[1]],
						[heatStops[2], heatColors[2]],
						[heatStops[3], heatColors[3]]
					]
				},
				'fill-extrusion-height': { 'type': 'identity', 'property': 'height' },
				'fill-extrusion-base': { 'type': 'identity', 'property': 'min_height' },
				'fill-extrusion-opacity': 0.8
			}
		}

		// FLOOD RISK
		floodRiskLayer = {
			'id': 'floodRiskLayer',
			'type': 'fill-extrusion',
			'source': 'composite',
			'source-layer': 'buildingsgeojson',
			'filter': ['has', 'coast_fld'],
			'layout': { 'visibility': 'none' },
			'paint': {
				'fill-extrusion-color': {
					'property': 'coast_fld',
					'stops': [
						[floodStops[0], floodColors[0]],
						[floodStops[1], floodColors[1]],
						[floodStops[2], floodColors[2]],
						[floodStops[3], floodColors[3]],
						[floodStops[4], floodColors[4]],
						[floodStops[5], floodColors[5]]
					]
				},
				'fill-extrusion-height': { 'type': 'identity', 'property': 'height' },
				'fill-extrusion-base': { 'type': 'identity', 'property': 'min_height' },
				'fill-extrusion-opacity': 0.8
			}
		}

		// INCOME
		incomeLayer = {
			'id': 'incomeLayer',
			'type': 'fill-extrusion',
			'source': 'composite',
			'source-layer': 'buildingsgeojson',
			'filter': ['has', 'med_inc'],
			'layout': { 'visibility': 'none' },
			'paint': {
				'fill-extrusion-color': {
					'property': 'med_inc',
					'stops': [
						[incomeStops[0], incomeColors[0]],
						[incomeStops[1], incomeColors[1]],
						[incomeStops[2], incomeColors[2]],
						[incomeStops[3], incomeColors[3]]
					]
				},
				'fill-extrusion-height': { 'type': 'identity', 'property': 'height' },
				'fill-extrusion-base': { 'type': 'identity', 'property': 'min_height' },
				'fill-extrusion-opacity': 0.8
			}
		}

		// ELDERLY POPULATION
		ageLayer = {
			'id': 'ageLayer',
			'type': 'fill-extrusion',
			'source': 'composite',
			'source-layer': 'buildingsgeojson',
			'filter': ['has', 'pop_ov65'],
			'layout': { 'visibility': 'none' },
			'paint': {
				'fill-extrusion-color': {
					'property': 'pop_ov65',
					'stops': [
						[ageStops[0], ageColors[0]],
						[ageStops[1], ageColors[1]],
						[ageStops[2], ageColors[2]],
						[ageStops[3], ageColors[3]],
						[ageStops[4], ageColors[4]],
						[ageStops[5], ageColors[5]],
						[ageStops[6], ageColors[6]],
						[ageStops[7], ageColors[7]],
						[ageStops[8], ageColors[8]],
						[ageStops[9], ageColors[9]]
					]
				},
				'fill-extrusion-height': { 'type': 'identity', 'property': 'height' },
				'fill-extrusion-base': { 'type': 'identity', 'property': 'min_height' },
				'fill-extrusion-opacity': 0.8
			}
		}

		// ETHNICITIES
		// White
		ethnicWhite = {
			'id': 'ethnicWhite',
			'type': 'fill-extrusion',
			'source': 'composite',
			'source-layer': 'buildingsgeojson',
			'filter': ['==', 'major_pop_grp', 'white_pop'],
			'layout': { 'visibility': 'none' },
			'paint': {
				'fill-extrusion-color': ethnicColors[0],
				'fill-extrusion-height': { 'type': 'identity', 'property': 'height' },
				'fill-extrusion-base': { 'type': 'identity', 'property': 'min_height' },
				'fill-extrusion-opacity': 0.7
			}
		}

		// Asian
		ethnicAsian = {
			'id': 'ethnicAsian',
			'type': 'fill-extrusion',
			'source': 'composite',
			'source-layer': 'buildingsgeojson',
			'filter': ['==', 'major_pop_grp', 'asian_pop'],
			'layout': { 'visibility': 'none' },
			'paint': {
				'fill-extrusion-color': ethnicColors[1],
				'fill-extrusion-height': { 'type': 'identity', 'property': 'height' },
				'fill-extrusion-base': { 'type': 'identity', 'property': 'min_height' },
				'fill-extrusion-opacity': 0.7
			}
		}

		// Hispanic
		ethnicHisp = {
			'id': 'ethnicHisp',
			'type': 'fill-extrusion',
			'source': 'composite',
			'source-layer': 'buildingsgeojson',
			'filter': ['==', 'major_pop_grp', 'hisp_pop'],
			'layout': { 'visibility': 'none' },
			'paint': {
				'fill-extrusion-color': ethnicColors[2],
				'fill-extrusion-height': { 'type': 'identity', 'property': 'height' },
				'fill-extrusion-base': { 'type': 'identity', 'property': 'min_height' },
				'fill-extrusion-opacity': 0.7
			}
		}

		// AfAm
		ethnicAfAm = {
			'id': 'ethnicAfAm',
			'type': 'fill-extrusion',
			'source': 'composite',
			'source-layer': 'buildingsgeojson',
			'filter': ['==', 'major_pop_grp', 'afm_pop'],
			'layout': { 'visibility': 'none' },
			'paint': {
				'fill-extrusion-color': ethnicColors[3],
				'fill-extrusion-height': { 'type': 'identity', 'property': 'height' },
				'fill-extrusion-base': { 'type': 'identity', 'property': 'min_height' },
				'fill-extrusion-opacity': 0.7
			}
		}
	}

	function addAllLayers() {
		// style.layers.push(grayBuildingsLayerMN)
		// style.layers.push(grayBuildingsLayerNotMN)
		style.layers.push(heatRiskLayer)
		style.layers.push(floodRiskLayer)
		style.layers.push(ethnicWhite)
		style.layers.push(ethnicAsian)
		style.layers.push(ethnicAfAm)
		style.layers.push(ethnicHisp)
		style.layers.push(incomeLayer)
		style.layers.push(ageLayer)
	}
})

// function easing(t) {
// 	return t * (2 - t)
// }

// function easeIn(t) {
// 	return t
// }

// function linear(t) {
// 	return t * 0.9
// }

// function easeInOutQuad(t) {
// 	return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
// }