import { z } from "zod";

export const userDtoSchema = z.object({
        "avatarUrl": z.string().nullish(),
        "emailAddress": z.string().nullish(),
        "emailVerified": z.boolean(),
        "fullName": z.string().nullish(),
        "id": z.uuid()});
export type UserDto = z.infer<typeof userDtoSchema>;
