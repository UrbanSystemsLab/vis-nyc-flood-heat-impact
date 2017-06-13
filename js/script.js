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
	addContinuousLegend('#legend-heat', heatColors)
	addCategoricalLegend('#legend-ethnicity', ethnicColors, ['White', 'Asian', 'Hispanic', 'African-American'])
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
			var legend = key.append('defs').append('svg:linearGradient').attr('id', 'gradient')
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
				.style('fill', 'url(#gradient)')
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
				// legend.append('stop').attr('offset', '0%').attr('stop-color', '#B30000').attr('stop-opacity', 1)
				// legend.append('stop').attr('offset', '100%').attr('stop-color', '#FEE8c8').attr('stop-opacity', 1)
				// var y = d3.scale.linear().range([300, 0]).domain([1, 100])
				// var yAxis = d3.svg.axis().scale(y).orient('right')
				// key.append('g').attr('class', 'y axis').attr('transform', 'translate(41,10)').call(yAxis).append('text').attr('transform', 'rotate(-90)').attr('y', 30).attr('dy', '.71em').style('text-anchor', 'end').text('axis title')
		}
	}

	function addCategoricalLegend(legendId, colors, labels) {
		// var gradient = colors.slice()
		// gradient.splice(0, 1)

		if (colors !== null) {
			// var colorScale = d3.scale.linear().range(gradient)
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

			// var legend = key.append('defs').append('svg:linearGradient').attr('id', 'gradient')
			// legend.selectAll('stop')
			// 	.data(colorScale.range())
			// 	.enter().append('stop')
			// 	.attr('offset', function(d, i) {
			// 		return i / (colorScale.range().length - 1)
			// 	})
			// 	.attr('stop-color', function(d) {
			// 		return d
			// 	})

			// key.append('rect')
			// 	.attr('width', barW)
			// 	.attr('height', barH)
			// 	.style('fill', 'url(#gradient)')
			// 	.attr('y', '20px')

			// var minLabel = key.append('text')
			// 	.attr('x', (0))
			// 	.attr('y', (50))
			// 	.attr('text-anchor', 'start')
			// 	.text('Low')

			// var maxLabel = key.append('text')
			// 	.attr('x', (barW))
			// 	.attr('y', (50))
			// 	.attr('text-anchor', 'end')
			// 	.text('High')
			// 	// legend.append('stop').attr('offset', '0%').attr('stop-color', '#B30000').attr('stop-opacity', 1)
			// 	// legend.append('stop').attr('offset', '100%').attr('stop-color', '#FEE8c8').attr('stop-opacity', 1)
			// 	// var y = d3.scale.linear().range([300, 0]).domain([1, 100])
			// 	// var yAxis = d3.svg.axis().scale(y).orient('right')
			// 	// key.append('g').attr('class', 'y axis').attr('transform', 'translate(41,10)').call(yAxis).append('text').attr('transform', 'rotate(-90)').attr('y', 30).attr('dy', '.71em').style('text-anchor', 'end').text('axis title')
		}
	}

	function showLegend(legendId) {
		$('.legend').fadeOut()
		$(legendId).fadeTo('slow', 1)
	}

	function createAllLayers() {
		// // GRAYSCALE BUILDINGS
		// grayBuildingsLayerMN = {
		// 	'id': 'grayBuildingsLayerMN',
		// 	'type': 'fill-extrusion',
		// 	'source': 'composite',
		// 	'source-layer': 'buildingsgeojson',
		// 	'filter': ['all', ['has', 'height'],
		// 		['==', 'borough', 'MN']
		// 	],
		// 	'layout': { 'visibility': 'none' },
		// 	'paint': {
		// 		'fill-extrusion-color': '#333',
		// 		'fill-extrusion-height': { 'type': 'identity', 'property': 'height' },
		// 		'fill-extrusion-base': { 'type': 'identity', 'property': 'min_height' },
		// 		'fill-extrusion-opacity': 0.9
		// 	}
		// }
		// grayBuildingsLayerNotMN = {
		// 	'id': 'grayBuildingsLayerNotMN',
		// 	'type': 'fill-extrusion',
		// 	'source': 'composite',
		// 	'source-layer': 'buildingsgeojson',
		// 	'filter': ['all', ['has', 'height'],
		// 		['!=', 'borough', 'MN']
		// 	],
		// 	'layout': { 'visibility': 'none' },
		// 	'paint': {
		// 		'fill-extrusion-color': '#333',
		// 		'fill-extrusion-height': { 'type': 'identity', 'property': 'height' },
		// 		'fill-extrusion-base': { 'type': 'identity', 'property': 'min_height' },
		// 		'fill-extrusion-opacity': 0.9
		// 	}
		// }

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
		style.layers.push(incomeLayer)
		style.layers.push(ageLayer)
		style.layers.push(ethnicWhite)
		style.layers.push(ethnicAsian)
		style.layers.push(ethnicAfAm)
		style.layers.push(ethnicHisp)
	}
})

// var style = null

// // Recommended video capture speed = 0.15
// var videoSpeed = 1
// var preLoadTime = 10

// // $.ajax({
// // 	'type': 'POST',
// // 	'data': 'dark',
// // 	'url': '/map-style'
// // }).done(function(data) {
// // 	style = JSON.parse(data)
// // 	style.sources = {
// // 		'composite': {
// // 			'url': 'mapbox://mapbox.mapbox-terrain-v2,mapbox.mapbox-streets-v7',
// // 			'type': 'vector'
// // 		},
// // 		'osm': {
// // 			'type': 'vector',
// // 			'tiles': ['http://localhost:4000/data/buildings/{z}/{x}/{y}.pbf']
// // 		}
// // 	}
// // 	console.log('Dark Style Loaded')
// // }).fail(function() {
// // 	console.log('error loading style')
// // })

// // $.getJSON('map-style/dark.json', function(data) {
// // 	style = data
// // })

// // Layers
// var grayBuildingsLayerMN, grayBuildingsLayerNotMN
// var heatRiskLayer
// var floodRiskLayer
// var incomeLayer
// var ageLayer
// var ethnicWhite, ethnicAsian, ethnicAfAm, ethnicHisp
// var dens2010, dens2020, dens2030, dens2040, dens2050, dens2060, dens2070, dens2080

// var ethnicColors = ['#8dd3c7', '#bebada', '#ffffb3', '#fb8072']
// var floodColors = ['#333', '#9ecae1', '#6baed6', '#4292c6', '#2171b5', '#08306b']
// var floodStops = [0, 1, 2, 3, 4, 5]
// var heatColors = ['#333', '#fee0d2', '#fc9272', '#de2d26']
// var heatStops = [0.45, 0.47, 0.49, 0.51]
// var incomeColors = ['#333', '#e5f5f9', '#99d8c9', '#2ca25f']
// var incomeStops = [0, 0.1, 0.2, 0.3]
// var ageColors = ['#333', '#fff7f3', '#fde0dd', '#fcc5c0', '#fa9fb5', '#f768a1', '#dd3497', '#ae017e', '#7a0177', '#49006a']
// var ageStops = [0, 0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08, 0.09]
// var densColors = ['#333', '#fee0d2', '#fc9272', '#de2d26']
// var densStops = [0, 0.004, 0.005, 0.009]

// // ethnicColors = ["#720068", "#006cbf", "#ff7493", "#29eec8"]

// var camera = {
// 	pos0: { center: [-73.981531, 40.536662], zoom: 14.2, pitch: 30, bearing: -8.00 },
// 	// grayBuildingsLayer
// 	pos1: { center: [-73.997240, 40.717824], zoom: 14.2, pitch: 30, bearing: -13 },
// 	// ethnicColors
// 	pos2: { center: [-73.997240, 40.717824], zoom: 14.5, pitch: 50, bearing: -20 },
// 	// floodRiskLayer
// 	pos3: { center: [-73.982009, 40.758149], zoom: 14.2, pitch: 50, bearing: -20 },
// 	// heatRiskLayer
// 	pos4: { center: [-73.944945, 40.802323], zoom: 14.9, pitch: 60, bearing: 30.20 },
// 	// incomeLayer
// 	// pos5: { center: [-73.957338, 40.789816], zoom: 14.9, pitch: 40, bearing: 30.20 },
// 	pos5: { center: [-73.985461, 40.749233], zoom: 14.9, pitch: 40, bearing: 30.20 },
// 	// ageLayer
// 	pos6: { center: [-73.957338, 40.789816], zoom: 14.9, pitch: 20, bearing: 30.20 },
// 	// dens2010
// 	pos7: { center: [-73.990390, 40.742724], zoom: 14.9, pitch: 8, bearing: 30.20 },
// 	// grayBuildingsLayer
// 	pos8: { center: [-73.980664, 40.740215], zoom: 11.1, pitch: 10, bearing: 0 }
// }
// var map
// $(() => {
// 	// mapboxgl.accessToken = 'pk.eyJ1IjoidGltb25tIiwiYSI6ImNpeGdsM3J3czAwMmMyb3BxNDhpOWY2cDMifQ.fGcwulOfy5N9AtD05ehH_A'

// 	addAllLayers()
// 	style.layers.push(grayBuildingsLayerMN)
// 	style.layers.push(grayBuildingsLayerNotMN)
// 	style.layers.push(heatRiskLayer)
// 	style.layers.push(floodRiskLayer)
// 	style.layers.push(incomeLayer)
// 	style.layers.push(ageLayer)
// 	style.layers.push(ethnicWhite)
// 	style.layers.push(ethnicAsian)
// 	style.layers.push(ethnicAfAm)
// 	style.layers.push(ethnicHisp)
// 	style.layers.push(dens2010)
// 	style.layers.push(dens2020)
// 	style.layers.push(dens2030)
// 	style.layers.push(dens2040)
// 	style.layers.push(dens2050)
// 	style.layers.push(dens2060)
// 	style.layers.push(dens2070)
// 	style.layers.push(dens2080)

// 	setTimeout(function() {
// 		map = new mapboxgl.Map({
// 			container: 'map',
// 			style: 'mapbox://styles/timonm/cj0dexcvc00042rqfacaxfr3x',
// 			center: camera.pos0.center,
// 			zoom: camera.pos0.zoom,
// 			pitch: camera.pos0.pitch,
// 			bearing: camera.pos0.bearing
// 		})
// 	}, 3000 / videoSpeed)

// 	setTimeout(function() {
// 		console.log('grayBuildingsLayer')
// 		fadeLayers([], ['grayBuildingsLayerNotMN', 'ethnicWhite', 'ethnicAsian', 'ethnicHisp', 'ethnicAfAm'])
// 		setTimeout(function() {
// 			map.easeTo({
// 				center: camera.pos1.center,
// 				zoom: camera.pos1.zoom,
// 				pitch: camera.pos1.pitch,
// 				bearing: camera.pos1.bearing,
// 				easing: easeInOutQuad,
// 				duration: (43000 + preLoadTime * 1000) / videoSpeed
// 			})
// 		}, preLoadTime * 1000)
// 	}, 5000 / videoSpeed)

// 	var startTime = 8

// 	setTimeout(function() {
// 		console.log('ethnicLayers')

// 		// fadeLayers(['grayBuildingsLayerMN'], ['ethnicWhite', 'ethnicAsian', 'ethnicHisp', 'ethnicAfAm'])
// 		setTimeout(function() {
// 			map.easeTo({
// 				center: camera.pos2.center,
// 				zoom: camera.pos2.zoom,
// 				pitch: camera.pos2.pitch,
// 				bearing: camera.pos2.bearing,
// 				easing: easeInOutQuad,
// 				duration: (20000 + preLoadTime * 1000) / videoSpeed
// 			})
// 		}, preLoadTime * 1000)
// 	}, (40 + startTime) * 1000 / videoSpeed)

// 	setTimeout(function() {
// 		console.log('floodRiskLayer')
// 		fadeLayers(['grayBuildingsLayerNotMN', 'ethnicWhite', 'ethnicAsian', 'ethnicHisp', 'ethnicAfAm'], ['floodRiskLayer'])

// 		setTimeout(function() {
// 			map.easeTo({
// 				center: camera.pos3.center,
// 				zoom: camera.pos3.zoom,
// 				pitch: camera.pos3.pitch,
// 				bearing: camera.pos3.bearing,
// 				easing: easeInOutQuad,
// 				duration: (26000 + preLoadTime * 1000) / videoSpeed
// 			})
// 		}, preLoadTime * 1000 + 4000)
// 	}, (60 + startTime) * 1000 / videoSpeed)

// 	setTimeout(function() {
// 		console.log('heatRiskLayer')
// 		fadeLayers(['floodRiskLayer'], ['heatRiskLayer'])
// 		setTimeout(function() {
// 			map.easeTo({
// 				center: camera.pos4.center,
// 				zoom: camera.pos4.zoom,
// 				pitch: camera.pos4.pitch,
// 				bearing: camera.pos4.bearing,
// 				easing: easeInOutQuad,
// 				duration: (30000 + preLoadTime * 1000) / videoSpeed
// 			})
// 		}, preLoadTime * 1000)
// 	}, (90 + startTime) * 1000 / videoSpeed)

// 	setTimeout(function() {
// 		console.log('incomeLayer')
// 		fadeLayers(['heatRiskLayer'], ['incomeLayer'])
// 		setTimeout(function() {
// 			map.flyTo({
// 				center: camera.pos5.center,
// 				zoom: camera.pos5.zoom,
// 				// pitch: camera.pos5.pitch,
// 				// bearing: camera.pos5.bearing,
// 				curve: 1,
// 				easing: easeInOutQuad,
// 				duration: (60000 + preLoadTime * 1000) / videoSpeed
// 			})
// 		}, preLoadTime * 1000)
// 	}, (120 + startTime) * 1000 / videoSpeed)

// 	setTimeout(function() {
// 		console.log('ageLayer')
// 		fadeLayers(['incomeLayer'], ['ageLayer'])
// 			// setTimeout(function() {
// 			// 	map.easeTo({
// 			// 		center: camera.pos6.center,
// 			// 		zoom: camera.pos6.zoom,
// 			// 		pitch: camera.pos6.pitch,
// 			// 		bearing: camera.pos6.bearing,
// 			// 		easing: easeInOutQuad,
// 			// 		duration: (30000 + preLoadTime * 1000) / videoSpeed
// 			// 	})
// 			// }, preLoadTime * 1000)
// 	}, (150 + startTime) * 1000 / videoSpeed)

// 	// setTimeout(function() {
// 	// 	console.log('dens2010')

// 	// 	fadeLayers(['ageLayer'], ['grayBuildingsLayerNotMN', 'dens2010'])

// 	// 	setTimeout(function() {
// 	// 		fadeLayers(['dens2010'], ['dens2020'])
// 	// 		console.log('dens2020')
// 	// 	}, 14 * 1000 / videoSpeed)
// 	// 	setTimeout(function() {
// 	// 		fadeLayers(['dens2020'], ['dens2030'])
// 	// 		console.log('dens2030')
// 	// 	}, 28 * 1000 / videoSpeed)
// 	// 	setTimeout(function() {
// 	// 		fadeLayers(['dens2030'], ['dens2040'])
// 	// 		console.log('dens2040')
// 	// 	}, 42 * 1000 / videoSpeed)
// 	// 	setTimeout(function() {
// 	// 		fadeLayers(['dens2040'], ['dens2050'])
// 	// 		console.log('dens2050')
// 	// 	}, 56 * 1000 / videoSpeed)

// 	// 	setTimeout(function() {
// 	// 		map.flyTo({
// 	// 			center: camera.pos7.center,
// 	// 			zoom: camera.pos7.zoom,
// 	// 			// pitch: camera.pos7.pitch,
// 	// 			// bearing: camera.pos7.bearing,
// 	// 			easing: easeInOutQuad,
// 	// 			duration: (60000 + preLoadTime * 1000) / videoSpeed
// 	// 		})
// 	// 	}, preLoadTime * 1000)
// 	// }, (180 + startTime) * 1000 / videoSpeed)

// 	setTimeout(function() {
// 		console.log('grayBuildingsLayer')
// 		fadeLayers(['ageLayer'], ['grayBuildingsLayerMN'])

// 		setTimeout(function() {
// 			map.easeTo({
// 				center: camera.pos8.center,
// 				zoom: camera.pos8.zoom,
// 				pitch: camera.pos8.pitch,
// 				bearing: camera.pos8.bearing,
// 				easing: easeInOutQuad,
// 				duration: (30000 + preLoadTime * 1000) / videoSpeed
// 			})
// 		}, preLoadTime * 1000)
// 	}, (180 + startTime) * 1000 / videoSpeed)

// 	// ---------------------
// 	// ---------------------
// })

// function fadeLayers(fadeOut, fadeIn) {
// 	fadeIn.forEach(function(layerName) {
// 		var opacity = 0
// 		map.setLayoutProperty(layerName, 'visibility', 'visible')
// 		map.setPaintProperty(layerName, 'fill-extrusion-opacity', 0)
// 		setTimeout(function() {
// 			var fadeIn = setInterval(function() {
// 				map.setPaintProperty(layerName, 'fill-extrusion-opacity', opacity)
// 				opacity = opacity + 0.08
// 				if (opacity > 0.8) {
// 					clearInterval(fadeIn)
// 				}
// 			}, 200 / videoSpeed)
// 		}, (4000 + preLoadTime) / videoSpeed)
// 	})
// 	setTimeout(function() {
// 		fadeOut.forEach(function(layerName) {
// 			var opacity = parseFloat(map.getPaintProperty(layerName, 'fill-extrusion-opacity')) // TODO: Get current property		
// 			var fadeOut = setInterval(function() {
// 				map.setPaintProperty(layerName, 'fill-extrusion-opacity', opacity)
// 				opacity = opacity - 0.08
// 				if (opacity < 0) {
// 					map.setLayoutProperty(layerName, 'visibility', 'none')
// 					clearInterval(fadeOut)
// 				}
// 			}, 200 / videoSpeed)
// 		})
// 	}, 4000 + preLoadTime / videoSpeed)
// }

// function addAllLayers() {
// 	// GREYSCALE BUILDINGS
// 	grayBuildingsLayerMN = {
// 		'id': 'grayBuildingsLayerMN',
// 		'type': 'fill-extrusion',
// 		'source': 'osm',
// 		'source-layer': 'buildingsgeojson',
// 		// 'filter': ['has', 'height'],
// 		'filter': ['all', ['has', 'height'],
// 			['==', 'borough', 'MN']
// 		],
// 		'layout': { 'visibility': 'none' },
// 		'paint': {
// 			'fill-extrusion-color': '#333',
// 			'fill-extrusion-height': { 'type': 'identity', 'property': 'height' },
// 			'fill-extrusion-base': { 'type': 'identity', 'property': 'min_height' },
// 			'fill-extrusion-opacity': 0.9
// 		}
// 	}
// 	grayBuildingsLayerNotMN = {
// 		'id': 'grayBuildingsLayerNotMN',
// 		'type': 'fill-extrusion',
// 		'source': 'osm',
// 		'source-layer': 'buildingsgeojson',
// 		'filter': ['all', ['has', 'height'],
// 			['!=', 'borough', 'MN']
// 		],
// 		'layout': { 'visibility': 'none' },
// 		'paint': {
// 			'fill-extrusion-color': '#333',
// 			'fill-extrusion-height': { 'type': 'identity', 'property': 'height' },
// 			'fill-extrusion-base': { 'type': 'identity', 'property': 'min_height' },
// 			'fill-extrusion-opacity': 0.9
// 		}
// 	}

// 	// HEATRISK
// 	heatRiskLayer = {
// 		'id': 'heatRiskLayer',
// 		'type': 'fill-extrusion',
// 		'source': 'osm',
// 		'source-layer': 'buildingsgeojson',
// 		'filter': ['has', 'heat_risk'],
// 		'layout': { 'visibility': 'none' },
// 		'paint': {
// 			'fill-extrusion-color': {
// 				'property': 'heat_risk',
// 				'stops': [
// 					[heatStops[0], heatColors[0]],
// 					[heatStops[1], heatColors[1]],
// 					[heatStops[2], heatColors[2]],
// 					[heatStops[3], heatColors[3]]
// 				]
// 			},
// 			'fill-extrusion-height': { 'type': 'identity', 'property': 'height' },
// 			'fill-extrusion-base': { 'type': 'identity', 'property': 'min_height' },
// 			'fill-extrusion-opacity': 0.8
// 		}
// 	}

// 	// FLOOD RISK
// 	floodRiskLayer = {
// 		'id': 'floodRiskLayer',
// 		'type': 'fill-extrusion',
// 		'source': 'osm',
// 		'source-layer': 'buildingsgeojson',
// 		'filter': ['has', 'coast_fld'],
// 		'layout': { 'visibility': 'none' },
// 		'paint': {
// 			'fill-extrusion-color': {
// 				'property': 'coast_fld',
// 				'stops': [
// 					[floodStops[0], floodColors[0]],
// 					[floodStops[1], floodColors[1]],
// 					[floodStops[2], floodColors[2]],
// 					[floodStops[3], floodColors[3]],
// 					[floodStops[4], floodColors[4]],
// 					[floodStops[5], floodColors[5]]
// 				]
// 			},
// 			'fill-extrusion-height': { 'type': 'identity', 'property': 'height' },
// 			'fill-extrusion-base': { 'type': 'identity', 'property': 'min_height' },
// 			'fill-extrusion-opacity': 0.8
// 		}
// 	}

// 	// INCOME
// 	incomeLayer = {
// 		'id': 'incomeLayer',
// 		'type': 'fill-extrusion',
// 		'source': 'osm',
// 		'source-layer': 'buildingsgeojson',
// 		'filter': ['has', 'med_inc'],
// 		'layout': { 'visibility': 'none' },
// 		'paint': {
// 			'fill-extrusion-color': {
// 				'property': 'med_inc',
// 				'stops': [
// 					[incomeStops[0], incomeColors[0]],
// 					[incomeStops[1], incomeColors[1]],
// 					[incomeStops[2], incomeColors[2]],
// 					[incomeStops[3], incomeColors[3]]
// 				]
// 			},
// 			'fill-extrusion-height': { 'type': 'identity', 'property': 'height' },
// 			'fill-extrusion-base': { 'type': 'identity', 'property': 'min_height' },
// 			'fill-extrusion-opacity': 0.8
// 		}
// 	}

// 	// INCOME
// 	ageLayer = {
// 		'id': 'ageLayer',
// 		'type': 'fill-extrusion',
// 		'source': 'osm',
// 		'source-layer': 'buildingsgeojson',
// 		'filter': ['has', 'pop_ov65'],
// 		'layout': { 'visibility': 'none' },
// 		'paint': {
// 			'fill-extrusion-color': {
// 				'property': 'pop_ov65',
// 				'stops': [
// 					[ageStops[0], ageColors[0]],
// 					[ageStops[1], ageColors[1]],
// 					[ageStops[2], ageColors[2]],
// 					[ageStops[3], ageColors[3]],
// 					[ageStops[4], ageColors[4]],
// 					[ageStops[5], ageColors[5]],
// 					[ageStops[6], ageColors[6]],
// 					[ageStops[7], ageColors[7]],
// 					[ageStops[8], ageColors[8]],
// 					[ageStops[9], ageColors[9]]
// 				]
// 			},
// 			'fill-extrusion-height': { 'type': 'identity', 'property': 'height' },
// 			'fill-extrusion-base': { 'type': 'identity', 'property': 'min_height' },
// 			'fill-extrusion-opacity': 0.8
// 		}
// 	}

// 	// ETHNICITIES
// 	// White
// 	ethnicWhite = {
// 		'id': 'ethnicWhite',
// 		'type': 'fill-extrusion',
// 		'source': 'osm',
// 		'source-layer': 'buildingsgeojson',
// 		'filter': ['==', 'major_pop_grp', 'white_pop'],
// 		'layout': { 'visibility': 'none' },
// 		'paint': {
// 			'fill-extrusion-color': ethnicColors[0],
// 			'fill-extrusion-height': { 'type': 'identity', 'property': 'height' },
// 			'fill-extrusion-base': { 'type': 'identity', 'property': 'min_height' },
// 			'fill-extrusion-opacity': 0.7
// 		}
// 	}

// 	// Asian
// 	ethnicAsian = {
// 		'id': 'ethnicAsian',
// 		'type': 'fill-extrusion',
// 		'source': 'osm',
// 		'source-layer': 'buildingsgeojson',
// 		'filter': ['==', 'major_pop_grp', 'asian_pop'],
// 		'layout': { 'visibility': 'none' },
// 		'paint': {
// 			'fill-extrusion-color': ethnicColors[1],
// 			'fill-extrusion-height': { 'type': 'identity', 'property': 'height' },
// 			'fill-extrusion-base': { 'type': 'identity', 'property': 'min_height' },
// 			'fill-extrusion-opacity': 0.7
// 		}
// 	}

// 	// Hispanic
// 	ethnicHisp = {
// 		'id': 'ethnicHisp',
// 		'type': 'fill-extrusion',
// 		'source': 'osm',
// 		'source-layer': 'buildingsgeojson',
// 		'filter': ['==', 'major_pop_grp', 'hisp_pop'],
// 		'layout': { 'visibility': 'none' },
// 		'paint': {
// 			'fill-extrusion-color': ethnicColors[2],
// 			'fill-extrusion-height': { 'type': 'identity', 'property': 'height' },
// 			'fill-extrusion-base': { 'type': 'identity', 'property': 'min_height' },
// 			'fill-extrusion-opacity': 0.7
// 		}
// 	}

// 	// AfAm
// 	ethnicAfAm = {
// 		'id': 'ethnicAfAm',
// 		'type': 'fill-extrusion',
// 		'source': 'osm',
// 		'source-layer': 'buildingsgeojson',
// 		'filter': ['==', 'major_pop_grp', 'afm_pop'],
// 		'layout': { 'visibility': 'none' },
// 		'paint': {
// 			'fill-extrusion-color': ethnicColors[3],
// 			'fill-extrusion-height': { 'type': 'identity', 'property': 'height' },
// 			'fill-extrusion-base': { 'type': 'identity', 'property': 'min_height' },
// 			'fill-extrusion-opacity': 0.7
// 		}
// 	}

// 	// DENSITIES
// 	dens2010 = {
// 		'id': 'dens2010',
// 		'type': 'fill-extrusion',
// 		'source': 'osm',
// 		'source-layer': 'buildingsgeojson',
// 		'filter': ['has', 'dens2010'],
// 		'layout': { 'visibility': 'none' },
// 		'paint': {
// 			'fill-extrusion-color': {
// 				'property': 'dens2010',
// 				'stops': [
// 					[densStops[0], densColors[0]],
// 					[densStops[1], densColors[1]],
// 					[densStops[2], densColors[2]],
// 					[densStops[3], densColors[3]]
// 				]
// 			},
// 			'fill-extrusion-height': { 'type': 'identity', 'property': 'height' },
// 			'fill-extrusion-base': { 'type': 'identity', 'property': 'min_height' },
// 			'fill-extrusion-opacity': 0.9
// 		}
// 	}
// 	dens2020 = {
// 		'id': 'dens2020',
// 		'type': 'fill-extrusion',
// 		'source': 'osm',
// 		'source-layer': 'buildingsgeojson',
// 		'filter': ['has', 'dens2020'],
// 		'layout': { 'visibility': 'none' },
// 		'paint': {
// 			'fill-extrusion-color': {
// 				'property': 'dens2020',
// 				'stops': [
// 					[densStops[0], densColors[0]],
// 					[densStops[1], densColors[1]],
// 					[densStops[2], densColors[2]],
// 					[densStops[3], densColors[3]]
// 				]
// 			},
// 			'fill-extrusion-height': { 'type': 'identity', 'property': 'height' },
// 			'fill-extrusion-base': { 'type': 'identity', 'property': 'min_height' },
// 			'fill-extrusion-opacity': 0.9
// 		}
// 	}

// 	dens2030 = {
// 		'id': 'dens2030',
// 		'type': 'fill-extrusion',
// 		'source': 'osm',
// 		'source-layer': 'buildingsgeojson',
// 		'filter': ['has', 'dens2030'],
// 		'layout': { 'visibility': 'none' },
// 		'paint': {
// 			'fill-extrusion-color': {
// 				'property': 'dens2030',
// 				'stops': [
// 					[densStops[0], densColors[0]],
// 					[densStops[1], densColors[1]],
// 					[densStops[2], densColors[2]],
// 					[densStops[3], densColors[3]]
// 				]
// 			},
// 			'fill-extrusion-height': { 'type': 'identity', 'property': 'height' },
// 			'fill-extrusion-base': { 'type': 'identity', 'property': 'min_height' },
// 			'fill-extrusion-opacity': 0.9
// 		}
// 	}

// 	dens2040 = {
// 		'id': 'dens2040',
// 		'type': 'fill-extrusion',
// 		'source': 'osm',
// 		'source-layer': 'buildingsgeojson',
// 		'filter': ['has', 'dens2040'],
// 		'layout': { 'visibility': 'none' },
// 		'paint': {
// 			'fill-extrusion-color': {
// 				'property': 'dens2040',
// 				'stops': [
// 					[densStops[0], densColors[0]],
// 					[densStops[1], densColors[1]],
// 					[densStops[2], densColors[2]],
// 					[densStops[3], densColors[3]]
// 				]
// 			},
// 			'fill-extrusion-height': { 'type': 'identity', 'property': 'height' },
// 			'fill-extrusion-base': { 'type': 'identity', 'property': 'min_height' },
// 			'fill-extrusion-opacity': 0.9
// 		}
// 	}

// 	dens2050 = {
// 		'id': 'dens2050',
// 		'type': 'fill-extrusion',
// 		'source': 'osm',
// 		'source-layer': 'buildingsgeojson',
// 		'filter': ['has', 'dens2050'],
// 		'layout': { 'visibility': 'none' },
// 		'paint': {
// 			'fill-extrusion-color': {
// 				'property': 'dens2050',
// 				'stops': [
// 					[densStops[0], densColors[0]],
// 					[densStops[1], densColors[1]],
// 					[densStops[2], densColors[2]],
// 					[densStops[3], densColors[3]]
// 				]
// 			},
// 			'fill-extrusion-height': { 'type': 'identity', 'property': 'height' },
// 			'fill-extrusion-base': { 'type': 'identity', 'property': 'min_height' },
// 			'fill-extrusion-opacity': 0.9
// 		}
// 	}
// 	dens2060 = {
// 		'id': 'dens2060',
// 		'type': 'fill-extrusion',
// 		'source': 'osm',
// 		'source-layer': 'buildingsgeojson',
// 		'filter': ['has', 'dens2060'],
// 		'layout': { 'visibility': 'none' },
// 		'paint': {
// 			'fill-extrusion-color': {
// 				'property': 'dens2050',
// 				'stops': [
// 					[densStops[0], densColors[0]],
// 					[densStops[1], densColors[1]],
// 					[densStops[2], densColors[2]],
// 					[densStops[3], densColors[3]]
// 				]
// 			},
// 			'fill-extrusion-height': { 'type': 'identity', 'property': 'height' },
// 			'fill-extrusion-base': { 'type': 'identity', 'property': 'min_height' },
// 			'fill-extrusion-opacity': 0.9
// 		}
// 	}
// 	dens2070 = {
// 		'id': 'dens2070',
// 		'type': 'fill-extrusion',
// 		'source': 'osm',
// 		'source-layer': 'buildingsgeojson',
// 		'filter': ['has', 'dens2070'],
// 		'layout': { 'visibility': 'none' },
// 		'paint': {
// 			'fill-extrusion-color': {
// 				'property': 'dens2070',
// 				'stops': [
// 					[densStops[0], densColors[0]],
// 					[densStops[1], densColors[1]],
// 					[densStops[2], densColors[2]],
// 					[densStops[3], densColors[3]]
// 				]
// 			},
// 			'fill-extrusion-height': { 'type': 'identity', 'property': 'height' },
// 			'fill-extrusion-base': { 'type': 'identity', 'property': 'min_height' },
// 			'fill-extrusion-opacity': 0.9
// 		}
// 	}
// 	dens2080 = {
// 		'id': 'dens2080',
// 		'type': 'fill-extrusion',
// 		'source': 'osm',
// 		'source-layer': 'buildingsgeojson',
// 		'filter': ['has', 'dens2080'],
// 		'layout': { 'visibility': 'none' },
// 		'paint': {
// 			'fill-extrusion-color': {
// 				'property': 'dens2080',
// 				'stops': [
// 					[densStops[0], densColors[0]],
// 					[densStops[1], densColors[1]],
// 					[densStops[2], densColors[2]],
// 					[densStops[3], densColors[3]]
// 				]
// 			},
// 			'fill-extrusion-height': { 'type': 'identity', 'property': 'height' },
// 			'fill-extrusion-base': { 'type': 'identity', 'property': 'min_height' },
// 			'fill-extrusion-opacity': 0.9
// 		}
// 	}
// }

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
