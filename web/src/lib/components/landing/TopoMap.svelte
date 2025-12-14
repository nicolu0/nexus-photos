<script lang="ts">
	import { onMount } from 'svelte';
	import * as THREE from 'three';
	import { createNoise2D } from 'simplex-noise';
	import gsap from 'gsap';

	let el: HTMLDivElement;

	onMount(() => {
		const scene = new THREE.Scene();
		scene.fog = new THREE.Fog(0xffffff, 85, 300);

		const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 600);
		camera.position.set(0, 30, 78);
		camera.lookAt(0, 0, 0);

		const renderer = new THREE.WebGLRenderer({
			alpha: true,
			antialias: true,
			powerPreference: 'high-performance'
		});
		renderer.setPixelRatio(window.devicePixelRatio);
		el.appendChild(renderer.domElement);

		const size = 280;
		const segs = 90;
		const geo = new THREE.PlaneGeometry(size, size, segs, segs);
		geo.rotateX(-Math.PI / 2);

		const meshMat = new THREE.MeshBasicMaterial({
			transparent: true,
			opacity: 0,
			depthWrite: false,
			depthTest: false
		});
		const plane = new THREE.Mesh(geo, meshMat);
		scene.add(plane);

		let wireGeo = new THREE.WireframeGeometry(geo);
		const wireMat = new THREE.LineBasicMaterial({
			color: 0xc8c7c4,
			transparent: true,
			opacity: 0,
			depthTest: false,
			depthWrite: false
		});
		const wire = new THREE.LineSegments(wireGeo, wireMat);
		wire.position.y = 0.02;
		scene.add(wire);

		const noise2D = createNoise2D();

		const targetAmp = 3.8;
		const targetWireOpacity = 0.55;

		const freqA = 0.022;
		const freqB = 0.006;

		const valleyHeight = 25.0;
		const valleyCurvePow = 1.6;

		let amp = 0;
		let shapeT = 0;

		function updateTerrain() {
			const pos = geo.attributes.position as THREE.BufferAttribute;
			const half = size / 2;

			for (let i = 0; i < pos.count; i++) {
				const x = pos.getX(i);
				const z = pos.getZ(i);

				const nx = Math.abs(x) / half;

				const edgeProfile = Math.pow((1 - Math.cos(Math.PI * nx)) * 0.5, valleyCurvePow);
				const bowl = edgeProfile * valleyHeight * shapeT;

				const nA = noise2D(x * freqA, z * freqA);
				const nB = noise2D(x * freqB, z * freqB);
				const noise = (nA * 0.8 + nB * 0.2) * amp * shapeT;

				pos.setY(i, bowl + noise);
			}

			pos.needsUpdate = true;
			geo.computeVertexNormals();

			wire.geometry.dispose();
			wireGeo.dispose();
			wireGeo = new THREE.WireframeGeometry(geo);
			wire.geometry = wireGeo;
		}

		updateTerrain();

		// Enter animation tuning
		const enterDuration = 1; // longer, more gradual fade/rise
		const terrainDuration = 1.4;
		const overlapAt = enterDuration * 0.4; // start terrain ~70% into fade

		const enterState = { y: -14, o: 0 };
		plane.position.y = enterState.y;
		wire.position.y = enterState.y + 0.02;

		const tl = gsap.timeline();

		// flat plane rises + fades in slowly
		tl.to(enterState, {
			y: 0,
			o: targetWireOpacity,
			duration: enterDuration,
			ease: 'power2.inOut',
			onUpdate: () => {
				plane.position.y = enterState.y;
				wire.position.y = enterState.y + 0.02;
				wireMat.opacity = enterState.o;
			}
		});

		// terrain begins before fade finishes (at ~70%)
		const terrainState = { t: 0 };
		tl.to(
			terrainState,
			{
				t: 1,
				duration: terrainDuration,
				ease: 'power3.out',
				onUpdate: () => {
					shapeT = terrainState.t;
					amp = targetAmp * terrainState.t;
					updateTerrain();
				}
			},
			overlapAt
		);

		const resize = () => {
			const { width, height } = el.getBoundingClientRect();
			if (width === 0 || height === 0) return;
			camera.aspect = width / height;
			camera.updateProjectionMatrix();
			renderer.setSize(width, height, true);
		};
		resize();
		window.addEventListener('resize', resize);

		let raf = 0;
		const animate = () => {
			raf = requestAnimationFrame(animate);
			renderer.render(scene, camera);
		};
		animate();

		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener('resize', resize);

			wire.geometry.dispose();
			wireMat.dispose();
			meshMat.dispose();
			geo.dispose();
			renderer.dispose();

			el.removeChild(renderer.domElement);
		};
	});
</script>

<div bind:this={el} class="pointer-events-none absolute inset-0 z-0" aria-hidden="true"></div>
