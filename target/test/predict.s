@ renamed two function calls to DTWdistance1246 and DTWdistance1247

@ option 1:
@ .comm is hard to support -> it would be better to generate the .asm file to get the dynamic arrays (g_0, g_1) from 
@ int getStateSize() - get the amount of internal state needed
@ void predict(void *state, float *inp, float *outp); - run the predicator, using state provided

@ option 2:
@ use Yotta assembler to compile
@ cpp with an extern to the predict function in the assembly code.

	.text
	.syntax unified
	.eabi_attribute	67, "2.09"
	.cpu	cortex-m0
	.eabi_attribute	6, 12
	.eabi_attribute	8, 0
	.eabi_attribute	9, 1
	.eabi_attribute	17, 1
	.eabi_attribute	20, 1
	.eabi_attribute	21, 1
	.eabi_attribute	23, 3
	.eabi_attribute	34, 1
	.eabi_attribute	24, 1
	.eabi_attribute	25, 1
	.eabi_attribute	38, 1
	.eabi_attribute	14, 0
	.file	"ELL"
	.globl	predict
	.p2align	2
	.type	predict,%function
	.code	16
	.thumb_func
predict:
	.fnstart
	.save	{r4, r5, r6, r7, lr}
	push	{r4, r5, r6, r7, lr}
	.pad	#28
	sub	sp, #28
	str	r1, [sp, #4]
	mov	r4, r0
	add	r1, sp, #16
	bl	DTWdistance1247
	add	r1, sp, #8
	mov	r0, r4
	bl	DTWdistance1246
	movs	r5, #0
	ldr	r6, .LCPI0_0
	ldr	r7, [sp, #8]
	ldr	r4, [sp, #12]
	mov	r0, r7
	mov	r1, r4
	mov	r2, r5
	mov	r3, r6
	bl	__aeabi_dcmplt
	cmp	r0, #0
	mov	r2, r5
	beq	.LBB0_2
	movs	r5, #1
	mov	r2, r7
	mov	r6, r4
.LBB0_2:
	ldr	r0, [sp, #16]
	ldr	r1, [sp, #20]
	mov	r3, r6
	bl	__aeabi_dcmplt
	cmp	r0, #0
	beq	.LBB0_4
	movs	r5, #2
.LBB0_4:
	ldr	r0, [sp, #4]
	str	r5, [r0]
	add	sp, #28
	pop	{r4, r5, r6, r7, pc}
	.p2align	2
.LCPI0_0:
	.long	1072693248
.Lfunc_end0:
	.size	predict, .Lfunc_end0-predict
	.fnend

	.globl	DTWdistance1247
	.p2align	2
	.type	DTWdistance1247,%function
	.code	16
	.thumb_func
DTWdistance1247:
	.fnstart
	.save	{r4, r5, r6, r7, lr}
	push	{r4, r5, r6, r7, lr}
	.pad	#36
	sub	sp, #36
	str	r1, [sp, #4]
	str	r0, [sp, #24]
	movs	r3, #0
	str	r3, [sp, #28]
	b	.LBB1_2
.LBB1_1:
	mov	r0, r4
	ldr	r2, [sp, #8]
	ldr	r3, [sp, #12]
	bl	__aeabi_dadd
	ldr	r2, [sp, #16]
	stm	r2!, {r0, r1}
	str	r5, [sp, #28]
	ldr	r3, [sp, #20]
.LBB1_2:
	cmp	r3, #2
	bgt	.LBB1_14
	lsls	r0, r3, #3
	ldr	r1, .LCPI1_2
	mov	r2, r1
	ldr	r6, [r2, r0]
	adds	r3, r3, #1
	str	r3, [sp, #20]
	lsls	r1, r3, #3
	ldr	r5, [r2, r1]
	adds	r0, r2, r0
	ldr	r4, [r0, #4]
	adds	r0, r2, r1
	str	r0, [sp, #16]
	ldr	r7, [r0, #4]
	mov	r0, r5
	mov	r1, r7
	mov	r2, r6
	mov	r3, r4
	bl	__aeabi_dcmplt
	cmp	r0, #0
	bne	.LBB1_5
	mov	r5, r6
.LBB1_5:
	cmp	r0, #0
	bne	.LBB1_7
	mov	r7, r4
.LBB1_7:
	movs	r4, #0
	mov	r0, r5
	mov	r1, r7
	mov	r2, r4
	mov	r3, r4
	bl	__aeabi_dcmpgt
	cmp	r0, #0
	mov	r1, r4
	bne	.LBB1_9
	mov	r1, r7
.LBB1_9:
	str	r1, [sp, #12]
	cmp	r0, #0
	mov	r0, r4
	bne	.LBB1_11
	mov	r0, r5
.LBB1_11:
	str	r0, [sp, #8]
	mov	r1, r4
	mov	r6, r4
	b	.LBB1_13
.LBB1_12:
	str	r1, [sp, #32]
	lsls	r1, r6, #3
	mov	r7, r4
	ldr	r4, [sp, #24]
	ldr	r0, [r4, r1]
	lsls	r3, r5, #3
	ldr	r2, .LCPI1_3
	mov	r5, r2
	ldr	r2, [r5, r3]
	adds	r1, r4, r1
	ldr	r1, [r1, #4]
	adds	r3, r5, r3
	ldr	r3, [r3, #4]
	bl	__aeabi_dsub
	mov	r2, r0
	mov	r3, r1
	movs	r0, #1
	lsls	r0, r0, #31
	bics	r3, r0
	mov	r0, r7
	ldr	r1, [sp, #32]
	bl	__aeabi_dadd
	mov	r4, r0
	adds	r6, r6, #1
.LBB1_13:
	ldr	r0, [sp, #28]
	adds	r5, r0, r6
	cmp	r6, #2
	ble	.LBB1_12
	b	.LBB1_1
.LBB1_14:
	ldr	r2, .LCPI1_0
	ldr	r3, .LCPI1_1
	bl	__aeabi_ddiv
	ldr	r2, [sp, #4]
	stm	r2!, {r0, r1}
	add	sp, #36
	pop	{r4, r5, r6, r7, pc}
	.p2align	2
.LCPI1_0:
	.long	3711700132
.LCPI1_1:
	.long	1069948826
.LCPI1_2:
	.long	g_0
.LCPI1_3:
	.long	c_0
.Lfunc_end1:
	.size	DTWdistance1247, .Lfunc_end1-DTWdistance1247
	.fnend

	.globl	DTWdistance1246
	.p2align	2
	.type	DTWdistance1246,%function
	.code	16
	.thumb_func
DTWdistance1246:
	.fnstart
	.save	{r4, r5, r6, r7, lr}
	push	{r4, r5, r6, r7, lr}
	.pad	#36
	sub	sp, #36
	str	r1, [sp, #4]
	str	r0, [sp, #24]
	movs	r3, #0
	str	r3, [sp, #28]
	b	.LBB2_2
.LBB2_1:
	mov	r0, r4
	ldr	r2, [sp, #8]
	ldr	r3, [sp, #12]
	bl	__aeabi_dadd
	ldr	r2, [sp, #16]
	stm	r2!, {r0, r1}
	str	r5, [sp, #28]
	ldr	r3, [sp, #20]
.LBB2_2:
	cmp	r3, #2
	bgt	.LBB2_14
	lsls	r0, r3, #3
	ldr	r1, .LCPI2_2
	mov	r2, r1
	ldr	r6, [r2, r0]
	adds	r3, r3, #1
	str	r3, [sp, #20]
	lsls	r1, r3, #3
	ldr	r5, [r2, r1]
	adds	r0, r2, r0
	ldr	r4, [r0, #4]
	adds	r0, r2, r1
	str	r0, [sp, #16]
	ldr	r7, [r0, #4]
	mov	r0, r5
	mov	r1, r7
	mov	r2, r6
	mov	r3, r4
	bl	__aeabi_dcmplt
	cmp	r0, #0
	bne	.LBB2_5
	mov	r5, r6
.LBB2_5:
	cmp	r0, #0
	bne	.LBB2_7
	mov	r7, r4
.LBB2_7:
	movs	r4, #0
	mov	r0, r5
	mov	r1, r7
	mov	r2, r4
	mov	r3, r4
	bl	__aeabi_dcmpgt
	cmp	r0, #0
	mov	r1, r4
	bne	.LBB2_9
	mov	r1, r7
.LBB2_9:
	str	r1, [sp, #12]
	cmp	r0, #0
	mov	r0, r4
	bne	.LBB2_11
	mov	r0, r5
.LBB2_11:
	str	r0, [sp, #8]
	mov	r1, r4
	mov	r6, r4
	b	.LBB2_13
.LBB2_12:
	str	r1, [sp, #32]
	lsls	r1, r6, #3
	mov	r7, r4
	ldr	r4, [sp, #24]
	ldr	r0, [r4, r1]
	lsls	r3, r5, #3
	ldr	r2, .LCPI2_3
	mov	r5, r2
	ldr	r2, [r5, r3]
	adds	r1, r4, r1
	ldr	r1, [r1, #4]
	adds	r3, r5, r3
	ldr	r3, [r3, #4]
	bl	__aeabi_dsub
	mov	r2, r0
	mov	r3, r1
	movs	r0, #1
	lsls	r0, r0, #31
	bics	r3, r0
	mov	r0, r7
	ldr	r1, [sp, #32]
	bl	__aeabi_dadd
	mov	r4, r0
	adds	r6, r6, #1
.LBB2_13:
	ldr	r0, [sp, #28]
	adds	r5, r0, r6
	cmp	r6, #2
	ble	.LBB2_12
	b	.LBB2_1
.LBB2_14:
	ldr	r2, .LCPI2_0
	ldr	r3, .LCPI2_1
	bl	__aeabi_ddiv
	ldr	r2, [sp, #4]
	stm	r2!, {r0, r1}
	add	sp, #36
	pop	{r4, r5, r6, r7, pc}
	.p2align	2
.LCPI2_0:
	.long	2863311531
.LCPI2_1:
	.long	1075489450
.LCPI2_2:
	.long	g_1
.LCPI2_3:
	.long	c_1
.Lfunc_end2:
	.size	DTWdistance1246, .Lfunc_end2-DTWdistance1246
	.fnend

	.type	c_0,%object
	.section	.rodata,"a",%progbits
	.p2align	4
c_0:
	.long	0
	.long	1072693248
	.long	0
	.long	1073741824
	.long	0
	.long	1072693248
	.long	0
	.long	1072693248
	.long	0
	.long	1072693248
	.long	0
	.long	1073741824
	.long	0
	.long	1072693248
	.long	0
	.long	1072693248
	.long	0
	.long	1072693248
	.size	c_0, 72

	.type	g_0,%object
	.local	g_0
	.comm	g_0,32,16
	.type	c_1,%object
	.p2align	4
c_1:
	.long	0
	.long	1072693248
	.long	0
	.long	1073741824
	.long	0
	.long	1074266112
	.long	0
	.long	1074790400
	.long	0
	.long	1075052544
	.long	0
	.long	1075314688
	.long	0
	.long	1075576832
	.long	0
	.long	1075838976
	.long	0
	.long	1075970048
	.size	c_1, 72

	.type	g_1,%object
	.local	g_1
	.comm	g_1,32,16

	.section	".note.GNU-stack","",%progbits
	.eabi_attribute	30, 1
