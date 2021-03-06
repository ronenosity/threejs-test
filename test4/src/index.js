import ReactDOM from "react-dom"
import React, { useState, Suspense } from "react";
import { TextureLoader } from 'three/src/loaders/TextureLoader.js'
import { Canvas, useThree, useFrame, useLoader, useResource } from "react-three-fiber"
import * as THREE from 'three';
import "./index.css"
import { Provider } from './useCannon';
import useEventListener from '@use-it/event-listener';
import Plane from './Plane.js';
import DraggableDodecahedron from './DraggableDodecahedron.js';
import Spinner from './Spinner.js';
import { get3DPosition } from './position-utils.js';
import { Vector2, Vector3 } from "three";


function Objects({ objects }) {
    return <React.Fragment>
        {objects}
    </React.Fragment>;
}

const keyPressed = {
};

function App() {

    const [objects, setObjects] = useState([]);

    const { mouse, camera } = useThree();

    const lightTargetYDelta = 120;
    const lightTargetXDelta = 80;
    const [lightPosition, setLightPosition] = useState([-lightTargetXDelta, -lightTargetYDelta, 200]);
    const [lightTargetPosition, setLightTargetPosition] = useState([0, 0, 0]);
    const onCameraMoved = (delta) => {
        const newLightPosition = delta.map((e, idx) => lightPosition[idx] + e);
        setLightPosition(newLightPosition);
        const newLightTargetPosition = [newLightPosition[0] + lightTargetXDelta, newLightPosition[1] + lightTargetYDelta, 0];
        setLightTargetPosition(newLightTargetPosition);
    };

    const [ref, material] = useResource();
    const [texture] = useLoader(TextureLoader, 'textures/stone/Stone_wall_001_COLOR.png');

    if (texture) {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(2, 2);
        texture.anisotropy = 16;
    }
    // const material = null;
    const onPlaneClick = (e) => {
        const position = get3DPosition({ screenX: mouse.x, screenY: mouse.y, camera });
        setObjects([...objects,
        <DraggableDodecahedron position={position} key={Math.random()} material={material} />]);
    };

    const handleKeyDown = (e) => {
        if (!keyPressed[e.key]) {
            keyPressed[e.key] = new Date().getTime();
        }
    };

    const handleKeyUp = (e) => {
        delete keyPressed[e.key];
    };

    const mouseWheel = (e) => {
        let delta = e.wheelDelta;
        delta = delta / 240;
        delta = -delta;
        if (delta <= 0) {
            delta -= camera.position.z * 0.1;
        } else {
            delta += camera.position.z * 0.1;
        }
        if (camera.position.z + delta > 1 && camera.position.z + delta < 200) {
            camera.translateZ(delta);
        }
    };
    useEventListener('keydown', handleKeyDown);
    useEventListener('keyup', handleKeyUp);
    useEventListener('wheel', mouseWheel);

    // move camera according to key pressed
    const updateCameraPositon = (delta) => {

        // if no key pressed, no update required
        if (Object.entries(keyPressed).length === 0) {
            return;
        }
        const newCameraPosition = new Vector3();
        newCameraPosition.copy(camera.position);
        Object.entries(keyPressed).forEach((e) => {
            const [key, start] = e;
            const duration = new Date().getTime() - start;

            // increase momentum if key pressed longer
            let momentum = Math.sqrt(duration + 200) * 0.01 + 0.05;

            // adjust for actual time passed
            momentum = momentum * delta / 0.016;

            // increase momentum if camera higher
            momentum = momentum + camera.position.z * 0.02;

            switch (key) {
                case 'w':
                    newCameraPosition.set(newCameraPosition.x, newCameraPosition.y + momentum, newCameraPosition.z)
                    break;
                case 's':
                    newCameraPosition.set(newCameraPosition.x, newCameraPosition.y - momentum, newCameraPosition.z);
                    break;
                case 'd':
                    newCameraPosition.set(newCameraPosition.x + momentum, newCameraPosition.y, newCameraPosition.z);
                    break;
                case 'a':
                    newCameraPosition.set(newCameraPosition.x - momentum, newCameraPosition.y, newCameraPosition.z);
                    break;
                default:
            }
        });
        const cameraDelta = camera.position.toArray().map((e, idx) => newCameraPosition.toArray()[idx] - e);
        onCameraMoved(cameraDelta);
        camera.position.copy(newCameraPosition);
    };

    useFrame((_, delta) => {
        updateCameraPositon(delta);
    });

    const lightTarget = new THREE.Mesh();
    return <React.Fragment >

        <ambientLight intensity={0.9} />

        <primitive object={lightTarget} position={lightTargetPosition} />
        <spotLight
            castShadow
            intensity={0.25}
            position={lightPosition}
            angle={Math.PI / 3}
            penumbra={1}
            shadow-mapSize={new Vector2(2048 * 5, 2048 * 5)}
            target={lightTarget}
        />
        <Provider>
            <meshLambertMaterial ref={ref} attach="material" map={texture} />
            <Objects objects={objects}>
            </Objects>
            <Plane position={[0, 0, -2]} onPlaneClick={onPlaneClick} />

        </Provider>
    </React.Fragment>

};



function createCanvas() {
    return <Canvas
        camera={{ position: [0, 0, 5] }}
        onCreated={({ gl, camera }) => {
            gl.shadowMap.enabled = true;
            gl.shadowMap.type = THREE.PCFSoftShadowMap;
            camera.rotateX(Math.PI / 5);
        }}
    >
        <Suspense fallback={<Suspense fallback={null}><Spinner></Spinner></Suspense>}>
            <App />
        </Suspense>
    </Canvas >

}

ReactDOM.render(
    createCanvas(),
    document.getElementById("root")
)


