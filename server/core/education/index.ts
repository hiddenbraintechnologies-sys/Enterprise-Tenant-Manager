import { Router } from "express";
import { studentsRouter } from "./students";
import { coursesRouter } from "./courses";
import { batchesRouter } from "./batches";
import { attendanceRouter } from "./attendance";
import { examsRouter } from "./exams";
import { feesRouter } from "./fees";

export const educationRouter = Router();

educationRouter.use("/students", studentsRouter);
educationRouter.use("/courses", coursesRouter);
educationRouter.use("/batches", batchesRouter);
educationRouter.use("/attendance", attendanceRouter);
educationRouter.use("/exams", examsRouter);
educationRouter.use("/fees", feesRouter);

export { studentsRouter, coursesRouter, batchesRouter, attendanceRouter, examsRouter, feesRouter };
