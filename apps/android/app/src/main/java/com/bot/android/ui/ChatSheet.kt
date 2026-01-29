package com.bot.android.ui

import androidx.compose.runtime.Composable
import com.bot.android.MainViewModel
import com.bot.android.ui.chat.ChatSheetContent

@Composable
fun ChatSheet(viewModel: MainViewModel) {
  ChatSheetContent(viewModel = viewModel)
}
