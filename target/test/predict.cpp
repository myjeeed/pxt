#include "pxt.h"
// extern and then just call the assembly predict
extern "C" void predict(double* input, double* output);

namespace gesture {
    /**
    * Predict.
    */
    //%
    int predict_function(int a, int b, int c) {
        double inp[3] = {a, b, c};
        double outp[3];

        predict(inp, outp);

        return outp[0];
    }
}
