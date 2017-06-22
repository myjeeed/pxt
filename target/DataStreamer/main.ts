// Timing
const sampleRate = 40; // 25fps
let prevTime = 0;

//The main loop: 
loops.forever(() => {
    while (true) {
        let time = control.millis();

        // If enough time has elapsed or the timer rolls over, do something
        if ((time - prevTime) >= sampleRate || time < prevTime) {
            serial.writeLine("ACC " + input.acceleration(Dimension.X) + " "
                + input.acceleration(Dimension.Y) + " "
                + input.acceleration(Dimension.Z) +
                " ROT " + input.rotation(Rotation.Pitch) + " "
                + input.rotation(Rotation.Roll));

            prevTime = time;
        }

        loops.pause(1);
    }
})