# Build against Teknic's Linux sFoundation SDK.
#
#   export SFND_ROOT=/path/to/Linux_Software
#   make

SFND_ROOT ?= $(error Set SFND_ROOT to your extracted Teknic Linux_Software directory)

CXX ?= g++
CXXFLAGS ?= -std=c++11 -O2 -Wall -Wextra

ifeq ($(wildcard $(SFND_ROOT)/pubSysCls/pubSysCls.h),)
  ifeq ($(wildcard $(SFND_ROOT)/sFoundation/pubSysCls/pubSysCls.h),)
    $(error Could not find pubSysCls headers under SFND_ROOT=$(SFND_ROOT))
  else
    SFND_INCLUDE := $(SFND_ROOT)/sFoundation/pubSysCls
  endif
else
  SFND_INCLUDE := $(SFND_ROOT)/pubSysCls
endif

ifeq ($(wildcard $(SFND_ROOT)/lib/Linux/libpubSysCls.a),)
  ifeq ($(wildcard $(SFND_ROOT)/Linux/libpubSysCls.a),)
    $(error Could not find libpubSysCls.a under SFND_ROOT=$(SFND_ROOT))
  else
    SFND_LIB_DIR := $(SFND_ROOT)/Linux
  endif
else
  SFND_LIB_DIR := $(SFND_ROOT)/lib/Linux
endif

INCLUDES := -I$(SFND_INCLUDE)
LIBS := -L$(SFND_LIB_DIR) -lpubSysCls -lpthread -ldl

.PHONY: all clean

all: read_encoder

read_encoder: read_encoder.cpp
	$(CXX) $(CXXFLAGS) $(INCLUDES) -o $@ $< $(LIBS)

clean:
	rm -f read_encoder
