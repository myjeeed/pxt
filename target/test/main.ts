let output = 0
loops.forever(() => {
    output = gesture.predict_function(input.acceleration(Dimension.X),
    input.acceleration(Dimension.Y),
    input.acceleration(Dimension.Z));
serial.writeLine("output: " + output)
    loops.pause(500)
    light.pixels.showAnimation(light.animation(LightAnimation.Rainbow), 500)
})
