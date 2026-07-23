import { Request, Response, NextFunction } from "express";
import AppError from "../errors/AppError";
import User from "../models/User";

const isAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (req.user?.isSuper) {
    return next();
  }

  const user = await User.findByPk(req.user.id, {
    attributes: ["profile", "super"]
  });

  if (!user || (user.profile !== "admin" && !user.super)) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  return next();
};

export default isAdmin;
