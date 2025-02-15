import { env } from "@/env.mjs";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

import { db } from "@/server/db";
import {
  apprenticeshipFormSchema,
  apprenticeshipSchema,
  apprenticeshipTypes,
  updateApprenticeshipParams, 
} from "@/server/schema/apprenticeship";
import type { Apprenticeship} from "@/server/schema/apprenticeship"
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const apprenticeshipRouter = createTRPCRouter({
  getApprenticeships: publicProcedure.query(async () => {
    return db.apprenticeship.findMany();
  }),
  getApprenticeshipsWithUsers: protectedProcedure.query(async () => {
    return db.apprenticeship.findMany({include: {user: true, curator:true, curatorGroup:true, apprenticeship_type: true}});
  }),


  getApprenticeshipsById: protectedProcedure
    .input(apprenticeshipSchema.pick({ user_id: true }))
    .query(async ({ input: { user_id } }) => {
      return db.apprenticeship.findFirst({
        where: {
          user_id,
        },
      });
    }),

  createApprenticeship: protectedProcedure
    .input(apprenticeshipFormSchema)
    .mutation(
      async ({
        input: apprts,
        ctx: {
          session: { user },
        },
      }) => {
        try {
        const { date, apprenticeshipTypeId, ...data } = {
          ...apprts,
          start_date: apprts.date.from,
          end_date: apprts.date.to,
        
        };
    const newApprenticeship = await db.apprenticeship.create({
      data: {
        ...data,
        user: {
          connect: {
            telegram_id: user.id,
          },
        },
        apprenticeship_type: {
          connect: {
            id: apprts.apprenticeshipTypeId,
          },
        },
      },
    });

   return  { success: true, newApprenticeship };
      }
      catch (error) {
        throw new TRPCError({ code: "BAD_REQUEST",
        message: "Error while creating, try again"
      });
      }
      },
    ),

  createApprtType: protectedProcedure
    .input(apprenticeshipTypes).mutation(async ({ input: apprtTypes }) => {
      try {
        const result = await db.apprenticeshipType.create({
          data: {
            ...apprtTypes
          }
        });
        return { success: true, result };
      } catch (error) {
        throw new TRPCError({ code: "BAD_REQUEST",
        message: "Error while creating, try again"
      });
      }
    }),

    removeApprtType: protectedProcedure
    .input(apprenticeshipTypes.extend({ id: z.string() }).pick({ id: true }))
    .mutation(async ({ input: { id } }) => {
      try {
        const result = await db.apprenticeshipType.delete({
          where: { id },
        });
        return { success: true, result };
      } catch (error) {
        throw new TRPCError({ code: "BAD_REQUEST",
        message: "Apprenticeship does not exist"
      });
      }
    }),
  deleteApprenticeship: protectedProcedure
    .input(apprenticeshipSchema.extend({ id: z.string() }).pick({ id: true }))
    .mutation(async ({ input: { id } }) => {
      return db.apprenticeship.delete({
        where: {
          id,
        },
      });
    }),
  
    updateApprenticeship: protectedProcedure
    .input(apprenticeshipSchema)
    .mutation(async ({  input: apprt }) => {
      const { user_id, apprenticeshipTypeId, curatorId, curatorGroupId, ...data} = apprt;
      try {
        const curatorRecord = curatorId ? await db.curator.findUnique({ where: { id: apprt.curatorId } }) : null;
        const curatorGroupRecord = curatorGroupId ? await db.curatorGroups.findUnique({ where: { id: apprt.curatorGroupId } }) : null;
        const result = await db.apprenticeship.update({
          data: {...data,
          user: {
            connect: {
              id: apprt.user_id,
            },
          },
          apprenticeship_type: {
            connect: {
              id: apprt.apprenticeshipTypeId
            }
          },
          curator: curatorRecord ? { connect: { id: curatorRecord.id } } : undefined,
          curatorGroup: curatorGroupRecord ? { connect: { id: curatorGroupRecord.id } } : undefined,
        },
          where: {
            id: apprt.id,
          },
        });
        return { success: true, result };
      } catch (error) {
        throw new TRPCError({ code: "BAD_REQUEST",
        message: "Apprenticeship does not exist"
      });
      }
    }),

  getTypes: protectedProcedure.query(async () => {
    return db.apprenticeshipType.findMany();
  }),
  attendance: protectedProcedure
  .input(z.object({ id: z.string(), user_id: z.string(), attendance: z.boolean() }))
  .mutation( async ({  input: props} ) => {
    try {
      if (props.attendance) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "reported"
        });
      }
      const exists = await db.user.findFirst({
        where: { id: props.user_id },
      });

      if (!exists) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User does not exist"
        });
      }

      const result = await db.apprenticeship.update({
        where: {
          id: props.id,
        },
        data: {
          attendance: true,
        },
      });
      const message = `Вашу заявку на прохождение практики подтвердили! По окончании практики отчёт необходимо загрузить по ссылке: https://auth.mkrit.ru `;
      await fetch(
        `https://api.telegram.org/bot${
          env.BOT_TOKEN
        }/sendMessage?chat_id=${exists.telegram_id}&text=${encodeURIComponent(
          message
        )}&parse_mode=HTML`
      );
      return { success: true, result };
    } catch (error) {
      throw new TRPCError({ code: "BAD_REQUEST",
      message: "Reported"
    });
    }
  }),
  signed: protectedProcedure
  .input(z.object({ id: z.string(), user_id: z.string() , signed: z.boolean()}))
  .mutation( async ({  input: props} ) => {
    try {
      if (props.signed) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "reported"
        });
      }
      const exists = await db.user.findFirst({
        where: { id: props.user_id },
      });

      if (!exists) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User does not exist"
        });
      }

      const result = await db.apprenticeship.update({
        where: {
          id: props.id,
        },
        data: {
          signed: true,
        },
      });
      const message = `Вашу заявку на прохождение практики подтвердили! По окончании практики отчёт необходимо загрузить по ссылке: https://auth.mkrit.ru `;
      await fetch(
        `https://api.telegram.org/bot${
          env.BOT_TOKEN
        }/sendMessage?chat_id=${exists.telegram_id}&text=${encodeURIComponent(
          message
        )}&parse_mode=HTML`
      );
      return { success: true, result };
    } catch (error) {
      throw new TRPCError({ code: "BAD_REQUEST",
      message: "Reported"
    });
    }
  }),
  reportSigned: protectedProcedure
  .input(z.object({ id: z.string(), user_id: z.string(), report_signed: z.boolean()}))
  .mutation( async ({  input: props} ) => {
    try {
      if (props.report_signed) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "reported"
        });
      }
      const exists = await db.user.findFirst({
        where: { id: props.user_id },
      });

      if (!exists) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User does not exist"
        });
      }

      const result = await db.apprenticeship.update({
        where: {
          id: props.id,
        },
        data: {
          report_signed: true,
        },
      });
      const message = `Вашу заявку на прохождение практики подтвердили! По окончании практики отчёт необходимо загрузить по ссылке: https://auth.mkrit.ru `;
      await fetch(
        `https://api.telegram.org/bot${
          env.BOT_TOKEN
        }/sendMessage?chat_id=${exists.telegram_id}&text=${encodeURIComponent(
          message
        )}&parse_mode=HTML`
      );
      return { success: true, result };
    } catch (error) {
      throw new TRPCError({ code: "BAD_REQUEST",
      message: "Reported"
    });
    }
  }),
  referralSigned: protectedProcedure
  .input(z.object({ id: z.string(), user_id: z.string(), referral_signed: z.boolean() }))
  .mutation( async ({  input: props} ) => {
    try {
      if (props.referral_signed) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "reported"
        });
      }
      const exists = await db.user.findFirst({
        where: { id: props.user_id },
      });

      if (!exists) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User does not exist"
        });
      }
      const result = await db.apprenticeship.update({
        where: {
          id: props.id,
        },
        data: {
          referral_signed: true,
        },
      });
      const message = `Вашу заявку на прохождение практики подтвердили! По окончании практики отчёт необходимо загрузить по ссылке: https://auth.mkrit.ru `;
      await fetch(
        `https://api.telegram.org/bot${
          env.BOT_TOKEN
        }/sendMessage?chat_id=${exists.telegram_id}&text=${encodeURIComponent(
          message
        )}&parse_mode=HTML`
      );
      return { success: true, result };
    } catch (error) {
      throw new TRPCError({ code: "BAD_REQUEST",
      message: "Reported"
    });
    }
  }),
});
