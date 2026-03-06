import fs from "fs";
import path from "path";
import mongoose from "mongoose";

function readMongoUri() {
  const envPath = path.join(process.cwd(), ".env");
  const envRaw = fs.readFileSync(envPath, "utf8");
  const match = envRaw.match(/^MONGO_URI=(.+)$/m);
  if (!match) {
    throw new Error("MONGO_URI not found in server/.env");
  }
  return match[1].trim();
}

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--regno") out.regno = argv[i + 1];
    if (arg === "--channel-name") out.channelName = argv[i + 1];
    if (arg === "--channel-id") out.channelId = argv[i + 1];
  }
  return out;
}

async function main() {
  const { regno, channelName, channelId } = parseArgs(process.argv);

  if (!regno) {
    throw new Error("Usage: node scripts/fixTeacherFromChannel.mjs --regno <REGNO> [--channel-name <NAME> | --channel-id <ID>]");
  }
  if (!channelName && !channelId) {
    throw new Error("Provide either --channel-name or --channel-id");
  }

  const mongoUri = readMongoUri();
  await mongoose.connect(mongoUri);

  const User = mongoose.model("FixUser", new mongoose.Schema({}, { strict: false, collection: "users" }));
  const Channel = mongoose.model("FixChannel", new mongoose.Schema({}, { strict: false, collection: "channels" }));
  const Classroom = mongoose.model("FixClassroom", new mongoose.Schema({}, { strict: false, collection: "classrooms" }));

  const user = await User.findOne({ "profile.regno": regno }).lean();
  if (!user) throw new Error(`User not found for regno=${regno}`);

  let channel = null;
  if (channelId) {
    if (!mongoose.Types.ObjectId.isValid(channelId)) throw new Error("Invalid --channel-id");
    channel = await Channel.findById(channelId).lean();
  } else {
    channel = await Channel.findOne({ name: channelName }).lean();
  }
  if (!channel) throw new Error("Channel not found");

  if (!channel.classroomId || !mongoose.Types.ObjectId.isValid(String(channel.classroomId))) {
    throw new Error("Channel has no valid classroomId");
  }

  const classroomBefore = await Classroom.findById(channel.classroomId).lean();
  if (!classroomBefore) throw new Error("Classroom referenced by channel not found");

  const updateResult = await Classroom.updateOne(
    { _id: channel.classroomId },
    { $addToSet: { teacherIds: user._id } }
  );

  const classroomAfter = await Classroom.findById(channel.classroomId).lean();

  const output = {
    teacher: {
      _id: String(user._id),
      regno,
      name: user?.profile?.name || null,
      firebaseUid: user.firebaseUid || null,
    },
    channel: {
      _id: String(channel._id),
      name: channel.name || null,
      classroomId: String(channel.classroomId),
      type: channel.type || null,
      classroomMode: channel.classroomMode || null,
    },
    classroom: {
      _id: String(classroomAfter._id),
      name: classroomAfter.name || null,
      teacherIdsBefore: (classroomBefore.teacherIds || []).map(String),
      teacherIdsAfter: (classroomAfter.teacherIds || []).map(String),
    },
    updateResult,
  };

  console.log(JSON.stringify(output, null, 2));
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("FIX_SCRIPT_ERROR:", err.message);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
