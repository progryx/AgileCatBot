import 'module-alias/register';

import config from './config';
import { ERRORS, setBotCommands } from './constants';
import {
    changeReviewer,
    deleteLastMessage,
    getInformation,
    greetingsUser,
    restrictChatAction,
    selectAction,
    sendMentions,
    specificTeamReview,
} from './controller';
import { restoreJobs } from './controller/shedules';
import { bot, deleteUser, initDB } from './model';
import { createChatCommands, getMessageData, idKeys, isDefined } from './utils';

async function init() {
    await initDB();
    await restoreJobs();

    await bot.setMyCommands(setBotCommands);

    const commands = createChatCommands(config.NAME);

    bot.on('message', async (message) => {
        const { isUserNeedsReview, hasUserCalledBot, msg, userName, ...keys } =
            await getMessageData(message);

        if (hasUserCalledBot) {
            if (!isDefined(userName)) {
                await deleteLastMessage({ ...keys, userName: '' });
                return await bot.sendMessage(keys.chatId, ERRORS.pleaseSetNickName);
            }

            const ids: idKeys = {
                ...keys,
                userName: '',
            };

            return ids.chatId === ids.userId
                ? await restrictChatAction(ids)
                : commands.start.includes(msg)
                ? await selectAction(ids)
                : commands.info.includes(msg)
                ? await getInformation({ ...ids, fromCommandLine: true })
                : commands.change.includes(msg)
                ? await changeReviewer(ids)
                : commands.review.includes(msg)
                ? await sendMentions(ids)
                : commands.reviewCommand.includes(msg)
                ? await specificTeamReview({ ...ids, fromCommandLine: true })
                : message.left_chat_member
                ? await deleteUser({ ...ids, userId: message.left_chat_member.id })
                : message.new_chat_members
                ? await greetingsUser(ids)
                : isUserNeedsReview
                ? await sendMentions({ ...ids, message: msg })
                : null;
        }
    });
}

init();
