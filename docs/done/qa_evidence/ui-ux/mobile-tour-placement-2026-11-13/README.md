# Student mobile tour placement

Before: `ff43129edfc9cfa4ee0ec89c544244ab4280f829`. After: `099bd5b1c95130aa08ac9d39bc74cf97173cadb0`.

Each pair uses the same seeded student, viewport, guide and step. The browser checked whether the guide card cleared the spotlight and dock, whether the spotlight was visible, and whether navigation buttons fit. The revised run also checked the visible bounds and hit targets of key controls. At 320 × 420 the old guide hid the spotlight. At 390 × 844 the old guide covered its target on Events, Tasks Overview and the final Tasks step.

The revised guide passed all 24 step and viewport combinations. The student mobile regression suite passed 62 checks. The geometry suite passed 20 unit tests.
