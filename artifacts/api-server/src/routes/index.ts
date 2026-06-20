import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import cafesRouter from "./cafes";
import menuRouter from "./menu";
import ordersRouter from "./orders";
import discoveryRouter from "./discovery";
import rewardsRouter from "./rewards";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(cafesRouter);
router.use(menuRouter);
router.use(ordersRouter);
router.use(discoveryRouter);
router.use(rewardsRouter);

export default router;
