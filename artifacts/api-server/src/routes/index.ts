import { Router, type IRouter } from "express";
import healthRouter from "./health";
import cafesRouter from "./cafes";
import menuRouter from "./menu";
import ordersRouter from "./orders";
import discoveryRouter from "./discovery";

const router: IRouter = Router();

router.use(healthRouter);
router.use(cafesRouter);
router.use(menuRouter);
router.use(ordersRouter);
router.use(discoveryRouter);

export default router;
