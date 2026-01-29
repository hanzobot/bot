package com.bot.android.protocol

import org.junit.Assert.assertEquals
import org.junit.Test

class BotProtocolConstantsTest {
  @Test
  fun canvasCommandsUseStableStrings() {
    assertEquals("canvas.present", BotCanvasCommand.Present.rawValue)
    assertEquals("canvas.hide", BotCanvasCommand.Hide.rawValue)
    assertEquals("canvas.navigate", BotCanvasCommand.Navigate.rawValue)
    assertEquals("canvas.eval", BotCanvasCommand.Eval.rawValue)
    assertEquals("canvas.snapshot", BotCanvasCommand.Snapshot.rawValue)
  }

  @Test
  fun a2uiCommandsUseStableStrings() {
    assertEquals("canvas.a2ui.push", BotCanvasA2UICommand.Push.rawValue)
    assertEquals("canvas.a2ui.pushJSONL", BotCanvasA2UICommand.PushJSONL.rawValue)
    assertEquals("canvas.a2ui.reset", BotCanvasA2UICommand.Reset.rawValue)
  }

  @Test
  fun capabilitiesUseStableStrings() {
    assertEquals("canvas", BotCapability.Canvas.rawValue)
    assertEquals("camera", BotCapability.Camera.rawValue)
    assertEquals("screen", BotCapability.Screen.rawValue)
    assertEquals("voiceWake", BotCapability.VoiceWake.rawValue)
  }

  @Test
  fun screenCommandsUseStableStrings() {
    assertEquals("screen.record", BotScreenCommand.Record.rawValue)
  }
}
